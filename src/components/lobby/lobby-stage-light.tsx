export type LobbyStageLightProps = {
  className?: string;
};

export function LobbyStageLight({ className = "" }: LobbyStageLightProps) {
  return (
    <div
      aria-hidden="true"
      className={["lobby-stage-light pointer-events-none absolute inset-0 overflow-hidden", className]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="lobby-stage-spotlight motion-safe:lobby-stage-spotlight-spin" />
      <span className="lobby-stage-shaft lobby-stage-shaft-a motion-safe:lobby-stage-shaft-drift" />
      <span className="lobby-stage-shaft lobby-stage-shaft-b motion-safe:lobby-stage-shaft-drift" />
    </div>
  );
}
