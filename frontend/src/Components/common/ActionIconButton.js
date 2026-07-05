import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";

function ActionIconButton({ label, className = "", onClick, children, disabled = false }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  const showTooltip = useCallback(() => {
    const node = buttonRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setCoords({
      top: rect.top,
      left: rect.left + rect.width / 2,
    });
    setVisible(true);
  }, []);

  const hideTooltip = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={className}
        aria-label={label}
        disabled={disabled}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        onClick={onClick}
      >
        {children}
      </button>
      {visible &&
        createPortal(
          <span
            className="action-icon-tooltip"
            style={{ top: coords.top, left: coords.left }}
            role="tooltip"
          >
            {label}
          </span>,
          document.body
        )}
    </>
  );
}

export default ActionIconButton;
