import { money, packingGroups } from "@/app/lib/orderReceipt.mjs";

export default function OrderReceiptItems({ items, compact = false }) {
  if (!items.length)
    return (
      <p className="order-notice">
        Item details haven’t loaded. Refresh this order before preparing it.
      </p>
    );
  return (
    <div className={`receipt-items ${compact ? "is-compact" : ""}`}>
      {packingGroups(items).map((pack) => (
        <section key={pack.label} className="receipt-pack">
          {pack.label !== "Order items" && (
            <header className="receipt-pack-header">
              <strong>{pack.label}</strong>
              <span>Pack separately · {pack.items.length} {pack.items.length === 1 ? "item" : "items"}</span>
            </header>
          )}
          {pack.items.map((item, index) => (
        <section key={`${pack.label}-${index}`} className="receipt-item">
          <div className="receipt-item-heading">
            <h3>{item.name}</h3>
            {item.packs > 1 && <span>{item.packs} packs</span>}
          </div>
          {item.packs > 1 && (
            <p className="receipt-pack-rule">
              Each pack: {item.portionsPerPack} × {item.portion}
            </p>
          )}
          <div className="receipt-line">
            <span>
              <strong>
                {item.portion}{" "}
                <span className="receipt-quantity">× {item.portionCount}</span>
              </strong>
              <small>
                {item.baseUnit == null
                  ? "Unit price not recorded"
                  : `${money(item.baseUnit)} each`}
              </small>
            </span>
            <b>{money(item.baseTotal)}</b>
          </div>
          {item.groups.map((group) => (
            <div key={group.name} className="receipt-option-group">
              <h4>{group.name}</h4>
              {group.options.map((option, optionIndex) => (
                <div key={optionIndex} className="receipt-line">
                  <span>
                    {option.name}{" "}
                    <span className="receipt-quantity">
                      × {option.quantity}
                    </span>
                    <small>
                      {option.unitPrice === 0
                        ? "Included"
                        : option.unitPrice == null
                          ? "Unit price not recorded"
                          : `${money(option.unitPrice)} each`}
                    </small>
                  </span>
                  <b>{option.total === 0 ? money(0) : money(option.total)}</b>
                </div>
              ))}
            </div>
          ))}
          {item.adjustment != null && item.adjustment !== 0 && (
            <div className="receipt-line receipt-adjustment">
              <span>Recorded price adjustment</span>
              <b>{money(item.adjustment)}</b>
            </div>
          )}
          {item.note && (
            <p className="receipt-item-note">
              <strong>Item note:</strong> {item.note}
            </p>
          )}
          <div className="receipt-item-total">
            <span>Item total</span>
            <strong>{money(item.total)}</strong>
          </div>
        </section>
          ))}
        </section>
      ))}
    </div>
  );
}
