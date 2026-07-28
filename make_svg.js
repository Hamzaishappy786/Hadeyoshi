const fs = require('fs');
const b64 = fs.readFileSync('assets/updated_icon.png').toString('base64');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <pattern id="img" patternUnits="userSpaceOnUse" x="0" y="0" width="120" height="120">
      <image href="data:image/png;base64,${b64}" x="0" y="0" width="120" height="120" preserveAspectRatio="xMidYMid meet" />
    </pattern>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="white" stop-opacity="0" />
      <stop offset="40%"  stop-color="white" stop-opacity="0" />
      <stop offset="50%"  stop-color="white" stop-opacity="0.75" />
      <stop offset="60%"  stop-color="white" stop-opacity="0" />
      <stop offset="100%" stop-color="white" stop-opacity="0" />
    </linearGradient>
    <clipPath id="round">
      <circle cx="60" cy="60" r="60" />
    </clipPath>
  </defs>
  <circle cx="60" cy="60" r="60" fill="url(#img)" />
  <g clip-path="url(#round)">
    <rect y="-10" width="120" height="140" fill="url(#sheen)" transform="skewX(-15)">
      <animateTransform attributeName="transform" type="translate" additive="sum"
        values="-180 0; -180 0; 280 0; 280 0"
        keyTimes="0; 0.01; 0.22; 1"
        dur="5s" repeatCount="indefinite" />
    </rect>
  </g>
</svg>`;

fs.writeFileSync('assets/icon-sheen.svg', svg);
console.log('SVG done');
