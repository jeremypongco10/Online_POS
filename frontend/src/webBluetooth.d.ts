/**
 * Minimal ambient types for the Web Bluetooth API — not part of
 * TypeScript's built-in DOM lib, and not worth pulling in
 * @types/web-bluetooth as a dependency for the handful of members
 * bluetoothPrinter.ts actually calls. Shapes follow the spec
 * (https://webbluetoothcg.github.io/web-bluetooth/) closely enough to
 * type-check real usage; anything this app doesn't call is left out.
 */

interface BluetoothRemoteGATTCharacteristic {
  readonly properties: {
    readonly write: boolean;
    readonly writeWithoutResponse: boolean;
  };
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
}

interface BluetoothRemoteGATTServer {
  readonly connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
  getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothDevice extends EventTarget {
  readonly name?: string;
  readonly gatt?: BluetoothRemoteGATTServer;
}

interface RequestDeviceOptions {
  filters?: Array<{ services?: string[]; name?: string; namePrefix?: string }>;
  optionalServices?: string[];
  acceptAllDevices?: boolean;
}

interface Bluetooth {
  requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
  getAvailability(): Promise<boolean>;
}

interface Navigator {
  readonly bluetooth?: Bluetooth;
}
