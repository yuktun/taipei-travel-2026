// Preserve pan, pinch and first-tap activation. Some iOS builds ignore
// touch-action: manipulation in their native double-tap recognizer.
export function installDoubleTapGuard(root = document, nav = navigator) {
  const ua = nav.userAgent || '';
  if (!(/iP(?:hone|ad|od)/i.test(ua) || ((nav.platform === 'MacIntel' || /Macintosh/i.test(ua)) && nav.maxTouchPoints > 1))) return () => {};
  const ignore = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [data-native-gestures]';
  const optedOut = e => Boolean(e.target?.closest?.(ignore));
  const radius = (a, b, px) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= px ** 2;
  const point = t => ({id:t.identifier, x:t.clientX, y:t.clientY});
  const capture = {capture:true, passive:true};
  const cancelable = {capture:true, passive:false};
  let start = null, previous = null;
  const reset = () => { start = previous = null; };
  const down = e => {
    if (e.touches.length !== 1 || e.changedTouches.length !== 1 || optedOut(e)) return reset();
    start = {...point(e.changedTouches[0]), at:e.timeStamp};
  };
  const move = e => {
    if (e.touches.length !== 1 || !start) return reset();
    const now = point(e.touches[0]);
    if (now.id !== start.id || !radius(start, now, 10)) reset();
  };
  const end = e => {
    if (!start || e.touches.length || e.changedTouches.length !== 1 || optedOut(e)) return reset();
    const now = {...point(e.changedTouches[0]), at:e.timeStamp};
    if (now.id !== start.id || now.at - start.at > 250 || !radius(start, now, 10)) return reset();
    start = null;
    if (previous && now.at > previous.at && now.at - previous.at <= 325 && radius(previous, now, 24)) {
      previous = null;
      if (e.cancelable) e.preventDefault();
    } else previous = now;
  };
  root.addEventListener('touchstart', down, capture);
  root.addEventListener('touchmove', move, capture);
  root.addEventListener('touchcancel', reset, capture);
  root.addEventListener('touchend', end, cancelable);
  return () => {
    root.removeEventListener('touchstart', down, capture);
    root.removeEventListener('touchmove', move, capture);
    root.removeEventListener('touchcancel', reset, capture);
    root.removeEventListener('touchend', end, cancelable);
    reset();
  };
}
