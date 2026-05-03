export function Toast({ msg, type, onClose }) {
  return (
    <div className={`toast toast-${type}`} onClick={onClose}>
      <span>{msg}</span>
      <button className="toast-close">×</button>
    </div>
  );
}
