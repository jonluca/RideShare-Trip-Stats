export const COLLECTION_OVERLAY_ID = "rideshare-stats-overlay";

export class CollectionOverlay {
  private overlay: HTMLElement | null = null;
  private progressBar: HTMLElement | null = null;
  private progressDetail: HTMLElement | null = null;
  private progressTitle: HTMLElement | null = null;

  constructor(private readonly note: string) {}

  static isOpen(): boolean {
    return Boolean(document.getElementById(COLLECTION_OVERLAY_ID));
  }

  show(title: string, detail: string) {
    const existing = document.getElementById(COLLECTION_OVERLAY_ID);
    if (existing) {
      this.overlay = existing;
      return;
    }

    if (!document.getElementById("rideshare-stats-styles")) {
      const style = document.createElement("style");
      style.id = "rideshare-stats-styles";
      style.textContent = `
#rideshare-stats-overlay{position:fixed;inset:0;z-index:2147483647;display:grid;padding:24px;color:#f4f7f5;background:rgba(5,7,6,.76);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;backdrop-filter:blur(10px);place-items:center}
#rideshare-stats-panel{width:min(520px,100%);padding:32px;border:1px solid rgba(255,255,255,.14);border-radius:20px;background:#111412;box-shadow:0 28px 80px rgba(0,0,0,.48)}
#rideshare-stats-mark{display:grid;width:40px;height:40px;margin-bottom:28px;color:#071109;border-radius:11px;background:#7df9a7;font-size:14px;font-weight:800;place-items:center}
#rideshare-stats-title{margin:0;font-size:28px;font-weight:650;letter-spacing:-.04em}
#rideshare-stats-detail{min-height:22px;margin:10px 0 24px;color:#9ba39e;font-size:14px;line-height:1.5}
#rideshare-stats-track{height:6px;overflow:hidden;border-radius:99px;background:rgba(255,255,255,.07)}
#rideshare-stats-progress{width:8%;height:100%;border-radius:inherit;background:#7df9a7;transition:width .2s ease}
#rideshare-stats-note{margin:18px 0 0;color:#737c76;font-size:11px;line-height:1.5}
@media(prefers-reduced-motion:reduce){#rideshare-stats-progress{transition:none}}
`;
      document.head.append(style);
    }

    this.overlay = document.createElement("div");
    this.overlay.id = COLLECTION_OVERLAY_ID;
    this.overlay.setAttribute("role", "dialog");
    this.overlay.setAttribute("aria-modal", "true");
    this.overlay.setAttribute("aria-labelledby", "rideshare-stats-title");

    const panel = document.createElement("div");
    panel.id = "rideshare-stats-panel";
    const mark = document.createElement("div");
    mark.id = "rideshare-stats-mark";
    mark.textContent = "R";
    this.progressTitle = document.createElement("h2");
    this.progressTitle.id = "rideshare-stats-title";
    this.progressDetail = document.createElement("p");
    this.progressDetail.id = "rideshare-stats-detail";
    const track = document.createElement("div");
    track.id = "rideshare-stats-track";
    this.progressBar = document.createElement("div");
    this.progressBar.id = "rideshare-stats-progress";
    const note = document.createElement("p");
    note.id = "rideshare-stats-note";
    note.textContent = this.note;
    track.append(this.progressBar);
    panel.append(mark, this.progressTitle, this.progressDetail, track, note);
    this.overlay.append(panel);
    document.body.prepend(this.overlay);
    this.setProgress(title, detail);
  }

  setProgress(title: string, detail: string, completed?: number, total?: number, unknownProgress?: number) {
    if (this.progressTitle) {
      this.progressTitle.textContent = title;
    }
    if (this.progressDetail) {
      this.progressDetail.textContent = detail;
    }
    if (this.progressBar) {
      const progress = completed !== undefined && total ? Math.min(100, (completed / total) * 100) : (unknownProgress ?? 8);
      this.progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    }
  }

  showError(title: string, detail: string) {
    this.setProgress(title, detail, 0, 1);
    if (this.progressBar) {
      this.progressBar.style.background = "#f08d7e";
    }
  }

  remove() {
    this.overlay?.remove();
    this.overlay = null;
  }
}
