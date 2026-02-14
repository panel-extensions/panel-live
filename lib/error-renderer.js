// Error rendering helper

/**
 * Parse a Python traceback string into structured frames.
 * Returns { frames: [{file, line, func, code}], errorType, errorMessage }.
 */
function parseTraceback(errorMsg) {
  const lines = (errorMsg || '').split('\n');
  const frames = [];
  let errorType = '';
  let errorMessage = '';

  for (let i = 0; i < lines.length; i++) {
    const fileLine = lines[i].match(/^\s*File "(.+)", line (\d+)(?:, in (.+))?/);
    if (fileLine) {
      const frame = { file: fileLine[1], line: fileLine[2], func: fileLine[3] || '' };
      // Next line is the code context (if it exists and is indented)
      if (i + 1 < lines.length && lines[i + 1].match(/^\s{4,}/)) {
        frame.code = lines[i + 1].trim();
        i++;
      }
      frames.push(frame);
    }
  }

  // Last non-empty line is typically "ErrorType: message"
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line) {
      const errMatch = line.match(/^(\w+(?:Error|Exception|Warning|Interrupt))\s*:\s*(.*)/s);
      if (errMatch) {
        errorType = errMatch[1];
        errorMessage = errMatch[2];
      } else {
        errorType = '';
        errorMessage = line;
      }
      break;
    }
  }

  return { frames, errorType, errorMessage };
}

/**
 * Filter traceback frames to show only user code.
 * User code frames come from <exec>, <module>, <string>, or <ast>.
 */
function filterUserFrames(frames) {
  const userPatterns = ['<exec>', '<module>', '<string>', '<ast>'];
  const filtered = frames.filter(f =>
    userPatterns.some(p => f.file.includes(p))
  );
  // If no user frames found, show last frame as fallback
  if (filtered.length === 0 && frames.length > 0) {
    return [frames[frames.length - 1]];
  }
  return filtered;
}

function escapeHtml(text) {
  return (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatFrame(frame) {
  let html = `<span class="pl-error-frame-loc">Line ${escapeHtml(frame.line)}`;
  if (frame.func && frame.func !== '<module>') {
    html += ` in <b>${escapeHtml(frame.func)}</b>`;
  }
  html += '</span>';
  if (frame.code) {
    html += `\n    <span class="pl-error-frame-code">${escapeHtml(frame.code)}</span>`;
  }
  return html;
}

export function renderError(targetEl, errorMsg) {
  // Non-Python errors (system/worker errors): render as clean system message
  const isPythonError = errorMsg && (
    errorMsg.includes('File "') ||
    /\w+(Error|Exception):/.test(errorMsg)
  );
  if (!isPythonError) {
    targetEl.innerHTML = `<div class="pl-error-panel pl-system-error">
      <div class="pl-error-header">${escapeHtml(errorMsg)}</div>
    </div>`;
    return;
  }

  const { frames, errorType, errorMessage } = parseTraceback(errorMsg);
  const userFrames = filterUserFrames(frames);

  // Build error header
  const headerText = errorType
    ? `${escapeHtml(errorType)}: ${escapeHtml(errorMessage)}`
    : escapeHtml(errorMessage);

  // Build user traceback
  let userTraceHtml = '';
  if (userFrames.length > 0) {
    userTraceHtml = '<div class="pl-error-trace">' +
      userFrames.map(formatFrame).join('\n') +
      '</div>';
  }

  // Build full traceback (collapsible) — only if there are internal frames
  let fullTraceHtml = '';
  if (frames.length > userFrames.length) {
    fullTraceHtml = `<details class="pl-error-details">
      <summary>Full traceback (${frames.length} frames)</summary>
      <pre class="pl-error-full-trace">${escapeHtml(errorMsg)}</pre>
    </details>`;
  }

  targetEl.innerHTML = `<div class="pl-error-panel">
    <div class="pl-error-header">${headerText}</div>
    ${userTraceHtml}
    ${fullTraceHtml}
    <button class="pl-error-copy-btn" title="Copy error">Copy error</button>
  </div>`;

  const copyBtn = targetEl.querySelector('.pl-error-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(errorMsg || '');
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy error'; }, 1500);
    });
  }
}
