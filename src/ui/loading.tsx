import { Component, type ReactNode } from "react";

/** Пока грузится часть справочника или экран. */
export function Loading({ text = "Загружаем справочник…" }: { text?: string }) {
  return (
    <div className="app screen loading-screen" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
}

interface BoundaryProps {
  children: ReactNode;
  resetKey: string;
  quiet?: boolean;
}

interface BoundaryState {
  failed: boolean;
  key: string;
}

/** Если часть сайта не скачалась (нет сети или сайт обновился), показываем понятное сообщение вместо белого экрана. */
export class LoadFailBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false, key: this.props.resetKey };

  static getDerivedStateFromProps(props: BoundaryProps, state: BoundaryState): Partial<BoundaryState> | null {
    if (props.resetKey !== state.key) return { failed: false, key: props.resetKey };
    return null;
  }

  static getDerivedStateFromError(): Partial<BoundaryState> {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    if (this.props.quiet) return null;
    return (
      <div className="app screen loading-screen" role="alert">
        <p>Не получилось загрузить эту часть сайта.</p>
        <p className="muted">Проверьте интернет и обновите страницу. Сохранённые герои никуда не делись.</p>
        <button type="button" className="btn primary" onClick={() => location.reload()}>Обновить страницу</button>
      </div>
    );
  }
}
