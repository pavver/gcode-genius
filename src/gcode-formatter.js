const vscode = require('vscode');

/**
 * Formats a G-code document according to best practices.
 * @param {string} text The G-code document text.
 * @returns {string}
 */
function formatGCode(text) {
    const lines = text.split(/\r?\n/);
    const formattedLines = [];
    let consecutiveEmptyLines = 0;

    for (const line of lines) {
        let trimmedLine = line.trim();

        if (!trimmedLine) {
            consecutiveEmptyLines++;
            if (consecutiveEmptyLines <= 3) {
                formattedLines.push('');
            }
            continue;
        }
        consecutiveEmptyLines = 0;

        if (trimmedLine.startsWith('%') || trimmedLine.match(/^O\d+/i)) {
            formattedLines.push(trimmedLine);
            continue;
        }

        let gcodePart = trimmedLine;
        let commentPart = '';

        const commentMatch = trimmedLine.match(/(\(.*\)|;.*)/);
        if (commentMatch) {
            gcodePart = trimmedLine.substring(0, commentMatch.index).trim();
            commentPart = commentMatch[0].trim();
        }

        if (gcodePart === '' && commentPart !== '') {
            formattedLines.push(commentPart);
            continue;
        }

        // Add spaces before any command letter to separate concatenated commands
        const spacedGcode = gcodePart.replace(/([A-Z])/g, ' $1').trim();

        // Split the line into logical blocks, each starting with a G, M, or T command
        const subLines = spacedGcode.split(/(?=[GMT])/i).filter(s => s.trim());

        if (subLines.length === 0) {
            if (commentPart) {
                formattedLines.push(commentPart);
            }
            continue;
        }

        subLines.forEach((subLine, index) => {
            const words = subLine.trim().split(/\s+/).filter(w => w && !w.toUpperCase().startsWith('N'));

            if (words.length === 0) {
                return;
            }

            const formattedWords = words.map(word => {
                const command = word.charAt(0).toUpperCase();
                const valueStr = word.substring(1);
                const value = parseFloat(valueStr);

                if (isNaN(value)) {
                    return command + valueStr;
                }

                if (['G', 'M', 'T', 'S'].includes(command)) {
                    return command + Math.round(value);
                }

                let formattedValue = value.toString();
                if (formattedValue.includes('.')) {
                    formattedValue = formattedValue.replace(/0+$/, '').replace(/\.$/, '');
                }

                return command + formattedValue;
            });

            let finalLine = formattedWords.join(' ');

            // Add the comment to the very last sub-line
            if (index === subLines.length - 1 && commentPart) {
                finalLine += ' ' + commentPart;
            }

            formattedLines.push(finalLine);
        });
    }

    return formattedLines.join('\n');
}


module.exports = {
    formatGCode
};
