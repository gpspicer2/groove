// The actual GROOVE logo artwork (pine-tree G, runner, bike wheel, sun,
// barbell-V, heartbeat E), cropped from the brand reference image.
export default function Wordmark({ className = '', height = 28 }) {
  return (
    <img
      src="/wordmark.png"
      alt="GROOVE"
      height={height}
      className={className}
      style={{ height, width: 'auto', display: 'inline-block' }}
    />
  );
}
