const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'mobileapp', 'facturex_mobile', 'src', 'App.tsx');
const destDir = path.join(__dirname, '..', 'src', 'mobile');
const destPath = path.join(destDir, 'MobileApp.tsx');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

let code = fs.readFileSync(srcPath, 'utf8');

// Use framer-motion instead of motion/react because it is already installed
code = code.replace(/from 'motion\/react'/g, "from 'framer-motion'");

// Remove the hardcoded iOS device simulator classes to make it fullscreen PWA ready
code = code.replace(
    /className="relative w-full max-w-\[400px\] h-\[850px\] bg-\[#f5f8f7\] shadow-2xl rounded-\[3rem\] overflow-hidden flex flex-col border-\[8px\] border-slate-900 ring-1 ring-slate-900\/5"/g,
    'className="relative w-full h-[100dvh] bg-[#f5f8f7] flex flex-col overflow-hidden"'
);

// Remove the simulated status bar (the 9:41 and battery top bar)
code = code.replace(/{\/\* Status Bar Simulator \*\/}[\s\S]*?{\/\* Header \*\/}/, '{/* Header */}');

// Remove the Home Indicator at the bottom
code = code.replace(/{\/\* Bottom Home Indicator \*\/}[\s\S]*?<\/div>\s*<\/div>\s*\);\s*}/, '      </div>\n    </div>\n  );\n}');

fs.writeFileSync(destPath, code);
console.log('MobileApp.tsx has been successfully copied and adapted.');
