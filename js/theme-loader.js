// Grab the exact root prefix from the script tag that just loaded this file
const currentScriptSrc = document.currentScript.getAttribute('src');
const rootPrefix = currentScriptSrc.replace('js/theme-loader.js', '');
const pathToThemes = rootPrefix + 'styles/css/';

// Load saved theme or default to purple.css
let activeTheme = 'purple.css';
if (typeof(Storage) !== 'undefined') {
    if (!localStorage.theme || localStorage.theme === 'null') {
        localStorage.theme = 'purple.css';
    }
    activeTheme = localStorage.theme;
}

// Inject the stylesheet synchronously to prevent FOUC
document.write('<link id="theme" rel="stylesheet" type="text/css" href="' + pathToThemes + activeTheme + '">');

function toggleTheme(theme) {
    const oldSheet = document.getElementById('theme');
    
    // 1. Create a brand new stylesheet link
    const newSheet = document.createElement('link');
    newSheet.rel = 'stylesheet';
    newSheet.type = 'text/css';
    newSheet.href = pathToThemes + theme;

    // 2. Wait until the new CSS file is 100% downloaded and parsed
    newSheet.onload = function() {
        // Remove the old stylesheet only AFTER the new one is active
        if (oldSheet) {
            oldSheet.remove();
        }
        // Assign the ID to the new stylesheet for future toggles
        newSheet.id = 'theme';
    };

    // 3. Append to the very end of <head> so it has top cascade priority
    document.head.appendChild(newSheet);
    
    // 4. Save choice to localStorage
    if (typeof(Storage) !== 'undefined') {
        localStorage.theme = theme;
    }
}

