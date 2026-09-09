import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import type { Bagger, Customer } from '../api/types';
import { KeyHint } from './KeyHint';
import { PosHelpDialog } from './PosHelpDialog';
import { POS_ACTION_TINTS } from './format';

interface Props {
  customer: Customer | null;
  onOpenCustomer: () => void;
  bagger: Bagger | null;
  onOpenBagger: () => void;
  cartHasItems: boolean;
  onOpenDiscount: () => void;
  onHold: () => void;
  onCancel: () => void;
  onReturn: () => void;
  onReprintReceipt: () => void;
}

/**
 * A soft tile in the action's own colour, label centred over its keycap
 * — no icon. The icons went because they read as clutter at this size,
 * but plain white rectangles were duller still, so the identity they
 * carried lives in the surface itself now: each action keeps its own hue
 * (POS_ACTION_TINTS), which is what a cashier actually aims at on a
 * button pressed hundreds of times a shift.
 *
 * Four things here are deliberate walk-backs from the previous version,
 * because together they were what made a row of these read as flat:
 *
 *   - The 4px colour bar down the left edge is gone. Flush to the edge
 *     with the label indented after it, six in a row read as a striped
 *     list — sidebar rows — rather than as controls.
 *   - The wash went from a flat 6% to a 12%-to-5% vertical gradient. At
 *     6% every button was the same off-grey whatever hue it nominally
 *     carried, so the colour coding cost a line of CSS and bought
 *     nothing.
 *   - The keycap stopped being the darkest thing on the button. A solid
 *     grey badge under a dark label put the most contrast on "F5"
 *     instead of on "Discount", which is backwards — the shortcut is a
 *     reminder, not the point.
 *   - The rest-state border is the action's hue rather than the neutral
 *     divider grey, which at this tint strength was the loudest edge on
 *     the tile and greyed the whole thing down with it.
 *
 * Content is centred rather than left-aligned for the same reason the
 * bar went: these stretch to share the row's width, and left-packed
 * content left a dead half-button of space on the right of each one.
 * Centred, that same width reads as padding instead.
 *
 * 50px minimum height because this is a touchscreen till — under every
 * published minimum for a finger target below about 40.
 *
 * `attached` is Customer/Bagger's "someone is on this sale" state. The
 * labels stay fixed rather than swapping in the person's name — the
 * receipt letterhead beside them already spells out who's attached, and
 * swapping made the two buttons jump around in width mid-sale — so this
 * state has to carry that signal alone. That's why it goes further than
 * the hover does: the whole surface fills solid with the action's colour
 * and the text flips to white, rather than the tint merely deepening.
 */
function ActionButton({
  id,
  label,
  keyLabel,
  tint,
  onClick,
  attached = false,
  danger = false,
}: {
  id: string;
  label: string;
  keyLabel: string;
  tint: string;
  onClick: () => void;
  attached?: boolean;
  danger?: boolean;
}) {
  // Solid-filled states (a customer/bagger attached, or Cancel under the
  // cursor) put white text on the action's own colour; everything else is
  // dark text on a wash of it. Worth naming once — half the rules below
  // branch on it, and "is this filled?" is the actual question, not "is
  // this attached or dangerous?".
  const filled = attached;

  // Cancel keeps the plain paper surface. Every other button here wears a
  // wash of its own colour, and if this one did too it would read as a
  // sixth pastel peer rather than as the one control that throws work
  // away.
  const surface = danger ? 'transparent' : `linear-gradient(180deg, ${tint}1f 0%, ${tint}0d 100%)`;

  return (
    <Button
      id={id}
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.375,
        // Grows to share the row's width. Uncapped on purpose: a maximum
        // here is what left a dead strip at the end of the row on a wide
        // screen.
        flex: '1 1 120px',
        minWidth: 0,
        minHeight: 50,
        px: 1.25,
        py: 0.875,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: filled ? tint : danger ? `${tint}5c` : `${tint}2e`,
        background: filled ? tint : surface,
        color: filled ? '#fff' : danger ? tint : 'text.primary',
        fontWeight: 700,
        fontSize: 13.5,
        lineHeight: 1.15,
        textTransform: 'none',
        boxShadow: filled ? `0 2px 8px -3px ${tint}` : '0 1px 2px rgba(16, 24, 40, 0.04)',
        transition: 'background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, color 0.15s ease',
        // KeyHint is shared with Pay and the search field, so its neutral
        // keycap is overridden here rather than changed at the source.
        // ml:0 cancels the margin it carries for sitting inline after a
        // label — underneath one, that margin just reads as a stray
        // indent. The rest is what stops the badge outweighing the label:
        // paper instead of a grey fill, with a hairline in the button's
        // own hue.
        '& kbd': {
          ml: 0,
          ...(filled
            ? {}
            : {
                bgcolor: 'background.paper',
                borderColor: `${tint}3d`,
                color: 'text.secondary',
              }),
        },
        '&:hover': {
          // Danger fills solid instead of deepening: the one button whose
          // hover should feel like a commitment rather than a highlight.
          background: danger || filled ? tint : `linear-gradient(180deg, ${tint}3d 0%, ${tint}24 100%)`,
          color: danger || filled ? '#fff' : 'text.primary',
          borderColor: tint,
          // Tinted rather than neutral grey — the lift and the colour are
          // the same signal, so they should come from the same hue.
          boxShadow: `0 6px 14px -8px ${tint}`,
          transform: 'translateY(-1px)',
        },
        // Once Cancel fills solid, the pale keycap all but disappears
        // against it — swap to the white-on-colour treatment KeyHint
        // already uses on Pay. Reaching for the <kbd> rather than passing
        // a prop because this depends on hover, which only CSS knows
        // about.
        ...(danger && {
          '&:hover kbd': {
            bgcolor: 'rgba(255, 255, 255, 0.22)',
            color: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.35)',
          },
        }),
        // Snaps back flat under a finger/click, so the press itself has a
        // physical read rather than only the ripple.
        '&:active': { transform: 'translateY(0)', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)' },
      }}
    >
      {/* Label over its keycap — two lines, so each button stays narrow
          enough that a rowful of them fits without the labels crowding
          their own shortcuts. Ellipsised rather than wrapped: a label that
          wrapped would push the keycap out of the tile and make one button
          taller than the rest of the row. */}
      <Box
        component="span"
        sx={{ minWidth: 0, maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {label}
      </Box>
      <KeyHint label={keyLabel} onAccent={filled} />
    </Button>
  );
}

/**
 * Every control here is ordered by its own F-key, ascending, left to
 * right — a cashier who knows "Discount is F5" can find it the same way
 * every time, without the layout re-sorting itself by some other logic
 * underneath the numbers.
 *
 * Shortcuts (F1) leads the row for exactly that reason, even though it's
 * the least-reached-for control here: it's about the terminal rather
 * than the sale, so no cart state makes it irrelevant, and ascending
 * order has nowhere else to put the lowest key. It moved down here from
 * a bare icon in PosHeader so that more of the till's function keys live
 * on a labelled control in one place instead of scattered across the
 * screen (Search and Pay are the two still elsewhere, and deliberately
 * so — each sits beside the field/flow it actually opens rather than in
 * this row of sale-property toggles).
 *
 * Customer (F3) and Bagger (F4) come next and are always here — they
 * attach to whatever sale is about to happen, empty cart or not. The
 * slot after them swaps with the sale, each still in ascending order:
 *
 *   - Empty cart: Reprint (F7), then Return (F8). Both deal with
 *     a sale that already happened, which is exactly the situation
 *     between customers — and Cancel Sale would have nothing to do here
 *     anyway.
 *   - Cart has items: Discount (F5), then Hold (F6), then Cancel Sale
 *     (F9) — pushed away from the routine buttons by a spacer rather
 *     than sitting flush after Hold, since it's the one destructive
 *     action in this row. Being the highest key here too means ascending
 *     order and "keep it away from everything else" land in the same
 *     place without a special case. Hold moved here from beside Pay in
 *     ReceiptPanel — it's a property of the sale being rung up (park it,
 *     don't finish it), the same category Discount is in, not something
 *     that belongs next to the payment flow the way Pay itself does.
 *
 * Nothing here is ever hidden behind a menu — every control a cashier
 * might reach for at a given moment is a single click, just never more
 * than what's actually relevant right now. F7/F8 (Reprint/Return) and F9
 * (Cancel) are guarded the same way in PosScreen, so the keyboard
 * shortcuts can't fire a control that isn't currently on screen. F6
 * (Hold) doesn't need that guard — handleHold already no-ops on an empty
 * cart on its own, which is why it's called directly rather than
 * DOM-clicking this row's button the way those others do.
 *
 * No hover tooltips on any of these — deliberately removed, not an
 * oversight. Each button's KeyHint badge (the "F9" pill below) already
 * shows its shortcut permanently, as plain visible text in the button
 * itself, so a "Shortcut: F9" tooltip added no information a screen
 * reader or a glance didn't already have; it just gave Popper.js another
 * chance to misplace itself against this row's real neighbours (three
 * separate bugs — blocking its own click target, overlapping the status
 * strip that used to run along the bottom of this column, and finally
 * overlapping the button's own label — none of which a genuinely empty
 * tooltip is worth carrying).
 *
 * (Refund used to sit here too, but it pointed at the exact same
 * /admin/customers/returns screen as Return — same backend flow, no
 * distinct refund-only path exists — so it was removed as a duplicate
 * rather than kept as a second button to the same place.)
 *
 * Customer, Bagger, Return, Reprint and Shortcuts keep stable
 * `id`s that useKeyboardShortcuts triggers via a DOM click — for the
 * first four because their dialog/navigation state isn't here
 * (Customer/Bagger's dialogs are up in ProductBrowser; Return navigates
 * away and Reprint opens PosScreen's own search dialog), and for
 * Shortcuts because its state IS here rather than in PosScreen, which
 * amounts to the same thing from the shortcut's side. Cancel doesn't
 * need that (PosScreen wires F9 straight to the same onCancel this
 * calls) but keeps one for parity and as a stable hook for tests. Hold
 * keeps one for the same reason, even though F6 also doesn't need it —
 * see the note above.
 */
export function CartActionsRow({
  customer,
  onOpenCustomer,
  bagger,
  onOpenBagger,
  cartHasItems,
  onOpenDiscount,
  onHold,
  onCancel,
  onReturn,
  onReprintReceipt,
}: Props) {
  // Owned here rather than in PosScreen so this row stays self-contained;
  // F1 reaches it by DOM-clicking the button below, the same way the other
  // shortcuts reach controls whose state isn't lifted.
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    // One wrapping row across the bottom of the product panel. Each
    // button grows to share the width (see ActionButton), so the row
    // always reaches the panel's own edge instead of stopping short and
    // leaving a dead strip; the spacer before Cancel Sale takes whatever
    // is left over once they have.
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'stretch',
        gap: 1,
      }}
    >
      {/* Lowest key in the row, so it leads unconditionally rather than
          living inside the cartHasItems branch below — F1 is F1 whether
          or not there's a cart. */}
      <ActionButton
        id="pos-help-button"
        label="Shortcuts"
        keyLabel="F1"
        tint={POS_ACTION_TINTS.shortcuts}
        onClick={() => setHelpOpen(true)}
      />

      <ActionButton
        id="pos-action-add-customer"
        label="Customer"
        keyLabel="F3"
        tint={POS_ACTION_TINTS.customer}
        onClick={onOpenCustomer}
        attached={Boolean(customer)}
      />

      <ActionButton
        id="pos-action-bagger"
        label="Bagger"
        keyLabel="F4"
        tint={POS_ACTION_TINTS.bagger}
        onClick={onOpenBagger}
        attached={Boolean(bagger)}
      />

      {cartHasItems ? (
        <>
          {/* The normal discount workflow: one discount for the whole
              sale, the POS working out which lines qualify. Sits with
              Customer/Bagger because it's the same kind of thing — a
              property of the sale being rung up, decided once — rather
              than with the destructive action pushed to the far end.
              Only while there's a cart: there is nothing to discount
              otherwise. */}
          <ActionButton
            id="pos-action-discount"
            label="Discount"
            keyLabel="F5"
            tint={POS_ACTION_TINTS.discount}
            onClick={onOpenDiscount}
          />

          {/* Parks the sale rather than finishing it — a property of the
              current sale, the same category Discount is in, not the
              payment flow itself, which is why this moved here from
              beside Pay in ReceiptPanel rather than staying paired with
              it. Only while there's a cart, same as Discount: an empty
              cart has nothing to hold. */}
          <ActionButton
            id="pos-action-hold"
            label="Hold"
            keyLabel="F6"
            tint={POS_ACTION_TINTS.hold}
            onClick={onHold}
          />

          {/* Pushes Cancel to the far right rather than letting it sit
              flush against the routine buttons — it's the one action
              here that destroys work, and flush against its neighbours
              it read as just another peer, a mis-tap risk on a touch
              screen. Doubles as where the row's leftover width collects,
              so the buttons themselves never have to stretch absurdly
              wide to close the gap. */}
          <Box sx={{ flex: 1, minWidth: 8 }} />

          {/* The only one that doesn't get the tinted surface: this
              destroys the sale in progress, so it stays legible as the
              dangerous one from across the row rather than reading as
              one more pastel peer. Bare surface, red border and red
              label, filling to solid red on hover — a cashier reaching
              for it should feel the difference before the click, not
              after. */}
          <ActionButton
            id="pos-action-cancel"
            label="Cancel Sale"
            keyLabel="F9"
            tint={POS_ACTION_TINTS.cancel}
            onClick={onCancel}
            danger
          />
        </>
      ) : (
        <>
          <ActionButton
            id="pos-action-reprint"
            label="Reprint"
            keyLabel="F7"
            tint={POS_ACTION_TINTS.reprint}
            onClick={onReprintReceipt}
          />

          <ActionButton
            id="pos-action-return"
            label="Return"
            keyLabel="F8"
            tint={POS_ACTION_TINTS.return}
            onClick={onReturn}
          />
        </>
      )}

      <PosHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </Box>
  );
}
