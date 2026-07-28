const fs = require('fs');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 72" width="520" height="72">
  <defs>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="white" stop-opacity="0" />
      <stop offset="40%"  stop-color="white" stop-opacity="0" />
      <stop offset="50%"  stop-color="white" stop-opacity="0.55" />
      <stop offset="60%"  stop-color="white" stop-opacity="0" />
      <stop offset="100%" stop-color="white" stop-opacity="0" />
    </linearGradient>
    <clipPath id="box">
      <rect x="0" y="0" width="520" height="72" rx="6" ry="6" />
    </clipPath>
  </defs>

  <!-- Background -->
  <rect x="0" y="0" width="520" height="72" rx="6" ry="6" fill="#161b22" />

  <!-- Left accent bar -->
  <rect x="0" y="0" width="3" height="72" rx="1" fill="#30363d" />

  <!-- Text -->
  <text font-family="ui-monospace, SFMono-Regular, Consolas, monospace" font-size="13" fill="#c9d1d9">
    <tspan x="18" y="26">
      <tspan fill="#8b949e">Windows: </tspan>
      <tspan fill="#79c0ff">C:\Users\YOU\Documents\VideoEditorProjects</tspan>
    </tspan>
    <tspan x="18" y="52">
      <tspan fill="#8b949e">Mac/Linux: </tspan>
      <tspan fill="#79c0ff">~/Documents/VideoEditorProjects</tspan>
    </tspan>
  </text>

  <!-- Sheen sweep every 5s -->
  <g clip-path="url(#box)">
    <rect y="-10" width="520" height="92" fill="url(#sheen)" transform="skewX(-15)">
      <animateTransform attributeName="transform" type="translate" additive="sum"
        values="-600 0; -600 0; 1000 0; 1000 0"
        keyTimes="0; 0.01; 0.22; 1"
        dur="5s" repeatCount="indefinite" />
    </rect>
  </g>
</svg>`;

fs.writeFileSync('assets/paths-sheen.svg', svg);
console.log('Done');
