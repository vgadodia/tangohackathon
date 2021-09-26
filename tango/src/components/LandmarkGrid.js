import "./MediaPipeStyle.css";
import "./ControlUtils.css";
import "./LandmarkGrid.css";

export default function LandmarkGrid({ gridRef }) {
  return (
    <div
      className="square-box"
      style={{ width: "100%", maxWidth: "100%", height: "100%" }}
    >
      <div
        ref={gridRef}
        style={{ height: "100%" }}
        className="landmark-grid-container"
      />
    </div>
  );
}
