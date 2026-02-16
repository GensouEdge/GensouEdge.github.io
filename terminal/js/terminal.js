// Simple command interpreter
(function() {
    const commands = {
        help: `Available commands:\nhelp - show this message\nabout - who we are\nclear - clear the screen`,
        about: "GensouEdge secret terminal. \nWelcome.",
        clear: null // handled specially
    };

    const outputEl = document.getElementById('output');
    const inputEl = document.getElementById('command-input');

    function writeLine(text) {
        // typewriter-style output, characters one by one
        inputEl.disabled = true;
        let i = 0;
        function step() {
            if (i < text.length) {
                outputEl.textContent += text.charAt(i);
                i++;
                window.scrollTo(0, document.body.scrollHeight);
                setTimeout(step, 30);
            } else {
                outputEl.textContent += '\n';
                window.scrollTo(0, document.body.scrollHeight);
                inputEl.disabled = false;
                inputEl.focus();
            }
        }
        step();
    }

    inputEl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const cmd = inputEl.value.trim();
            // echo command immediately without animation
            outputEl.textContent += '> ' + cmd + '\n';
            window.scrollTo(0, document.body.scrollHeight);
            inputEl.value = '';
            handleCommand(cmd);
        }
    });

    function handleCommand(cmd) {
        if (!cmd) return;
        if (commands.hasOwnProperty(cmd)) {
            if (cmd === 'clear') {
                outputEl.textContent = '';
                return;
            }
            writeLine(commands[cmd]);
        } else {
            writeLine('未知的命令');
        }
    }
})();
