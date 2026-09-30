/**
 * Connects to, and writes ESC/POS bytes to, a BLE thermal receipt printer
 * — built against the OC-PT210 / GOOJPRT PT-210, a common 58mm portable
 * printer that supports both Bluetooth Classic and BLE (Bluetooth 4.0).
 * Only the BLE half is usable from a browser at all: the Web Bluetooth API
 * only ever speaks GATT, never Classic/SPP, which is a hard platform
 * limit with no code-level way around it.
 *
 * This is what makes "automatic, silent printing" actually possible,
 * unlike the desktop --kiosk-printing route: window.print() always goes
 * through the OS/browser print pipeline and its dialog (or Chrome's own
 * suppression flag on desktop — Android has no equivalent a page can
 * reach). Writing ESC/POS bytes straight to the printer's GATT
 * characteristic never touches that pipeline at all, so there is no
 * dialog to suppress in the first place.
 *
 * The three CANDIDATE_SERVICES below are the GATT service/characteristic
 * pairs reported for this printer model — not verified against this
 * specific unit, since that isn't possible without the physical hardware
 * in hand. resolveWriteCharacteristic() tries each in turn, then falls
 * back to scanning every service the device actually exposes for any
 * writable characteristic, so a unit whose firmware doesn't match any of
 * the three still has a real chance of connecting.
 */
import { buildReceiptEscPos } from './receiptEscPos';
import type { PaymentMethodOption, Receipt } from '../api/types';

export type BluetoothPrinterStatus = 'disconnected' | 'connecting' | 'connected';

export interface BluetoothPrinterState {
  status: BluetoothPrinterStatus;
  deviceName: string | null;
  /** Set on the most recent failed connect/print, cleared on the next successful one — surfaced by PrinterConnectControl so a cashier sees why, not just that it failed. */
  lastError: string | null;
}

const CANDIDATE_SERVICES: Array<{ service: string; write: string }> = [
  // Reported for the GOOJPRT PT-210 / OC-PT210.
  { service: '000018f0-0000-1000-8000-00805f9b34fb', write: '00002af1-0000-1000-8000-00805f9b34fb' },
  { service: '0000fee7-0000-1000-8000-00805f9b34fb', write: '0000fec7-0000-1000-8000-00805f9b34fb' },
  // ISSC/Cypress UART service — a common generic BLE-serial module used across many cheap printers, PT-210 included per community reports.
  { service: '49535343-fe7d-4ae5-8fa9-9fafd205e455', write: '49535343-1e4d-4bd9-ba61-23c647249616' },
];

// Conservative BLE write size: the default ATT MTU before negotiation is
// 23 bytes (20 usable after the 3-byte ATT header), and Android doesn't
// reliably negotiate a larger one for every peripheral. Chunking this
// small costs nothing on a device that could take more — it just makes
// more, smaller writes — while being the one size that works everywhere.
const CHUNK_SIZE = 20;
const CHUNK_DELAY_MS = 15;

let device: BluetoothDevice | null = null;
let writeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
let state: BluetoothPrinterState = { status: 'disconnected', deviceName: null, lastError: null };
const listeners = new Set<(s: BluetoothPrinterState) => void>();

function setState(next: Partial<BluetoothPrinterState>): void {
  state = { ...state, ...next };
  listeners.forEach((fn) => fn(state));
}

/** For a status pill/menu item to reflect connection state without prop-drilling it through PosScreen. */
export function subscribeBluetoothPrinter(fn: (s: BluetoothPrinterState) => void): () => void {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

export function getBluetoothPrinterState(): BluetoothPrinterState {
  return state;
}

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && navigator.bluetooth !== undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function handleGattDisconnected(): void {
  writeCharacteristic = null;
  setState({ status: 'disconnected', deviceName: null });
}

async function resolveWriteCharacteristic(server: BluetoothRemoteGATTServer): Promise<BluetoothRemoteGATTCharacteristic> {
  for (const candidate of CANDIDATE_SERVICES) {
    try {
      const service = await server.getPrimaryService(candidate.service);
      return await service.getCharacteristic(candidate.write);
    } catch {
      // Not this one on this unit — try the next candidate.
    }
  }

  // None of the known profiles matched — fall back to whatever the device
  // actually advertises, and take the first characteristic that can be
  // written to at all.
  const services = await server.getPrimaryServices();
  for (const service of services) {
    const characteristics = await service.getCharacteristics();
    const writable = characteristics.find((c) => c.properties.writeWithoutResponse || c.properties.write);
    if (writable) return writable;
  }

  throw new Error("Connected, but couldn't find a printable channel on this device.");
}

/**
 * Opens the browser's device picker — must be called directly from a
 * click handler (a real user gesture), which is a Web Bluetooth
 * requirement, not a choice made here. Only ever needs doing once per
 * browser install per printer: Chrome remembers the grant, and a later
 * reconnect (see reconnectRememberedPrinter) doesn't need to show the
 * picker again.
 */
export async function connectBluetoothPrinter(): Promise<void> {
  if (!isWebBluetoothSupported()) {
    throw new Error(
      'Bluetooth printing needs Chrome/Edge on Android with this site trusted as a secure origin — see chrome://flags if this is a plain http:// address.'
    );
  }

  setState({ status: 'connecting', lastError: null });
  try {
    const requested = await navigator.bluetooth!.requestDevice({
      acceptAllDevices: true,
      optionalServices: CANDIDATE_SERVICES.map((c) => c.service),
    });
    await attachToDevice(requested);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not connect to the printer.';
    setState({ status: 'disconnected', deviceName: null, lastError: message });
    throw err;
  }
}

async function attachToDevice(requested: BluetoothDevice): Promise<void> {
  device = requested;
  device.addEventListener('gattserverdisconnected', handleGattDisconnected);

  if (!device.gatt) throw new Error('This device has no GATT server to connect to.');
  const server = await device.gatt.connect();
  writeCharacteristic = await resolveWriteCharacteristic(server);
  setState({ status: 'connected', deviceName: device.name ?? 'Bluetooth printer', lastError: null });
}

/**
 * Silently reattaches to a printer Chrome already granted access to, for
 * the (best-effort — not every Chrome build supports it) case where a
 * page reload shouldn't force the cashier to re-pick the printer from the
 * picker every time. A no-op, not an error, where getDevices() itself
 * isn't available.
 */
export async function reconnectRememberedPrinter(): Promise<void> {
  if (!isWebBluetoothSupported() || typeof navigator.bluetooth!.getAvailability !== 'function') return;

  const bluetooth = navigator.bluetooth as Bluetooth & { getDevices?: () => Promise<BluetoothDevice[]> };
  if (typeof bluetooth.getDevices !== 'function') return;

  try {
    const known = await bluetooth.getDevices();
    if (known.length === 0) return;
    setState({ status: 'connecting', lastError: null });
    await attachToDevice(known[0]);
  } catch {
    setState({ status: 'disconnected', deviceName: null });
  }
}

export function disconnectBluetoothPrinter(): void {
  device?.gatt?.disconnect();
  writeCharacteristic = null;
  setState({ status: 'disconnected', deviceName: null });
}

async function writeBytes(bytes: Uint8Array): Promise<void> {
  if (!writeCharacteristic) throw new Error('No printer connected.');

  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    const chunk = bytes.slice(offset, offset + CHUNK_SIZE);
    if (writeCharacteristic.properties.writeWithoutResponse) {
      await writeCharacteristic.writeValueWithoutResponse(chunk);
    } else {
      await writeCharacteristic.writeValue(chunk);
    }
    if (offset + CHUNK_SIZE < bytes.length) await sleep(CHUNK_DELAY_MS);
  }
}

/** True only once a printer is actually connected right now — the one thing ReceiptModal needs to decide whether it can print silently or has to fall back to window.print(). */
export function isBluetoothPrinterReady(): boolean {
  return state.status === 'connected' && writeCharacteristic !== null;
}

export async function printReceiptViaBluetooth(
  receipt: Receipt,
  methods: PaymentMethodOption[],
  taxSystem: string | null | undefined,
  currency: string | null | undefined
): Promise<void> {
  const bytes = buildReceiptEscPos(receipt, methods, taxSystem, currency);
  try {
    await writeBytes(bytes);
    setState({ lastError: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to print to the Bluetooth printer.';
    setState({ lastError: message });
    throw err;
  }
}
