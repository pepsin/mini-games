/**
 * ESLint flat config for landing_bomb
 * Includes a custom rule to detect escape failures in locale interpolation placeholders.
 */

const localePlaceholderRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect malformed or unescaped interpolation placeholders like {{param}} in locale strings',
    },
    messages: {
      malformedPlaceholder: 'Malformed interpolation placeholder "{{match}}". Use exactly {{example}} with no spaces or special characters.',
      unclosedOpen: 'Unclosed interpolation opening braces "{{" in string.',
      unmatchedClose: 'Unmatched closing braces "}}" in string.',
    },
    schema: [],
  },
  create(context) {
    function checkStringValue(value, node) {
      if (typeof value !== 'string') return;

      let scanIndex = 0;
      while (scanIndex < value.length) {
        const openIdx = value.indexOf('{{', scanIndex);
        if (openIdx === -1) break;

        const closeIdx = value.indexOf('}}', openIdx);
        if (closeIdx === -1) {
          context.report({
            node,
            messageId: 'unclosedOpen',
          });
          break;
        }

        const inner = value.slice(openIdx + 2, closeIdx);
        if (!/^[A-Za-z0-9_]+$/.test(inner)) {
          const match = value.slice(openIdx, closeIdx + 2);
          context.report({
            node,
            messageId: 'malformedPlaceholder',
            data: { match, example: '{{paramName}}' },
          });
        }

        scanIndex = closeIdx + 2;
      }

      // Detect unmatched }} appearing before any {{
      const firstClose = value.indexOf('}}');
      const firstOpen = value.indexOf('{{');
      if (firstClose !== -1 && (firstOpen === -1 || firstClose < firstOpen)) {
        context.report({
          node,
          messageId: 'unmatchedClose',
        });
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string') {
          checkStringValue(node.value, node);
        }
      },
      TemplateElement(node) {
        const cooked = node.value?.cooked;
        if (typeof cooked === 'string') {
          checkStringValue(cooked, node);
        }
      },
    };
  },
};

const localePlugin = {
  meta: { name: 'locale-linter', version: '1.0.0' },
  rules: {
    'valid-placeholders': localePlaceholderRule,
  },
};

export default [
  {
    files: ['js/locales/*.js'],
    plugins: {
      locale: localePlugin,
    },
    rules: {
      'locale/valid-placeholders': 'error',
    },
  },
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        wx: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        Math: 'readonly',
        Date: 'readonly',
        JSON: 'readonly',
        Object: 'readonly',
        Array: 'readonly',
        String: 'readonly',
        Number: 'readonly',
        Boolean: 'readonly',
        RegExp: 'readonly',
        Promise: 'readonly',
        Error: 'readonly',
        Uint8Array: 'readonly',
        Float32Array: 'readonly',
        Image: 'readonly',
        CanvasRenderingContext2D: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        performance: 'readonly',
        navigator: 'readonly',
        window: 'readonly',
        document: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        AudioContext: 'readonly',
        OscillatorNode: 'readonly',
        GainNode: 'readonly',
        localStorage: 'readonly',
        WebSocket: 'readonly',
        Touch: 'readonly',
        TouchEvent: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        Event: 'readonly',
        FileReader: 'readonly',
        XMLHttpRequest: 'readonly',
        fetch: 'readonly',
        Headers: 'readonly',
        FormData: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        parseInt: 'readonly',
        parseFloat: 'readonly',
        isNaN: 'readonly',
        isFinite: 'readonly',
        encodeURIComponent: 'readonly',
        decodeURIComponent: 'readonly',
        encodeURI: 'readonly',
        decodeURI: 'readonly',
        gtag: 'readonly',
        escape: 'readonly',
        unescape: 'readonly',
        eval: 'readonly',
        undefined: 'readonly',
        Infinity: 'readonly',
        NaN: 'readonly',
      },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'warn',
    },
  },
];
