const fs = require('fs');
const file = './salone-app/frontend/app/(dashboard)/agenda/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// There's a gap error: I used "mb-6" in `<div className="flex flex-col mb-6 gap-6">` but then added mb-4 in the new bar. Let's fix that wrapper class to reduce margin bottom since the bar is inside it or after it.

// wait, the structure is:
// <div className="flex flex-col mb-6 gap-6">
//    <div className="flex flex-col xl:flex-row ...> (The sticky top)
//    </div>
// </div>
// {viewMode !== 'giorno' && ( <div className="flex items-center gap-3 px-2 mt-[-10px] mb-4... )

// Let's remove the "mb-6" and "gap-6" from the wrapper because we just want the sticky bar to float properly.
content = content.replace('<div className="flex flex-col mb-6 gap-6">', '<div className="flex flex-col mb-4 gap-2">');

fs.writeFileSync(file, content, 'utf8');
