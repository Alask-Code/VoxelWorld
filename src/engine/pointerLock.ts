const POINTER_LOCK_ERROR = 'Não foi possível capturar o cursor. Tente novamente.';

export default function requestGamePointerLock(
  canvas: HTMLCanvasElement,
  onError: (message: string) => void
): void {
  let settled = false;
  let timeout: number | undefined;
  let handleError = () => {};
  let handleChange = () => {};

  function cleanup() {
    document.removeEventListener('pointerlockerror', handleError);
    document.removeEventListener('pointerlockchange', handleChange);
    if (timeout !== undefined) window.clearTimeout(timeout);
  }
  handleError = () => {
    if (settled) return;
    settled = true;
    cleanup();
    onError(POINTER_LOCK_ERROR);
  };
  handleChange = () => {
    if (document.pointerLockElement !== canvas || settled) return;
    settled = true;
    cleanup();
  };

  document.addEventListener('pointerlockerror', handleError);
  document.addEventListener('pointerlockchange', handleChange);

  try {
    Promise.resolve(canvas.requestPointerLock()).then(
      () => {
        if (document.pointerLockElement === canvas || settled) {
          cleanup();
          return;
        }
        timeout = window.setTimeout(handleError, 1500);
      },
      handleError
    );
  } catch {
    handleError();
  }
}
