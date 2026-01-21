import { useEffect, useRef, useCallback } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { indentOnInput, bracketMatching, foldGutter, foldKeymap, syntaxHighlighting, defaultHighlightStyle, StreamLanguage } from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { lintKeymap } from '@codemirror/lint';
import { oneDark } from '@codemirror/theme-one-dark';

// Nginx 语法高亮定义
const nginxLanguage = StreamLanguage.define({
    token(stream) {
        // 跳过空白
        if (stream.eatSpace()) return null;

        // 注释
        if (stream.match('#')) {
            stream.skipToEnd();
            return 'comment';
        }

        // 字符串
        if (stream.match(/"([^"\\]|\\.)*"/)) return 'string';
        if (stream.match(/'([^'\\]|\\.)*'/)) return 'string';

        // 变量
        if (stream.match(/\$[a-zA-Z_][a-zA-Z0-9_]*/)) return 'variableName';

        // 数字
        if (stream.match(/\d+[kmgKMG]?/)) return 'number';

        // 块级关键字
        if (stream.match(/\b(http|server|location|upstream|events|stream|mail|map|geo|types|limit_except|if)\b/)) {
            return 'keyword';
        }

        // 常用指令
        if (stream.match(/\b(listen|server_name|root|index|error_page|access_log|error_log|include|worker_processes|worker_connections|sendfile|keepalive_timeout|gzip|ssl|ssl_certificate|ssl_certificate_key|ssl_protocols|ssl_ciphers|proxy_pass|proxy_set_header|proxy_http_version|proxy_cache|fastcgi_pass|fastcgi_param|rewrite|return|try_files|alias|expires|add_header|set|deny|allow)\b/)) {
            return 'atom';
        }

        // 常量
        if (stream.match(/\b(on|off|true|false|default|main|crit|error|warn|notice|info|debug)\b/)) {
            return 'bool';
        }

        // 操作符和括号
        if (stream.match(/[{}();~]/)) return 'punctuation';
        if (stream.match(/[=~*^]/)) return 'operator';

        // 其他标识符
        if (stream.match(/[a-zA-Z_][a-zA-Z0-9_]*/)) return 'propertyName';

        // 跳过其他字符
        stream.next();
        return null;
    },
    startState() {
        return {};
    },
});

interface NginxEditorProps {
    value: string;
    onChange?: (value: string) => void;
    readOnly?: boolean;
    height?: string;
}

export function NginxEditor({ value, onChange, readOnly = false, height = '500px' }: NginxEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    const handleChange = useCallback((update: { state: EditorState; docChanged: boolean }) => {
        if (update.docChanged && onChange) {
            onChange(update.state.doc.toString());
        }
    }, [onChange]);

    useEffect(() => {
        if (!editorRef.current) return;

        // 检查是否是深色模式
        const isDark = document.documentElement.classList.contains('dark');

        // 创建编辑器高度主题
        const editorTheme = EditorView.theme({
            '&': {
                height: '100%',
            },
            '.cm-scroller': {
                overflow: 'auto',
            },
        });

        const extensions = [
            editorTheme,
            lineNumbers(),
            highlightActiveLineGutter(),
            highlightSpecialChars(),
            history(),
            foldGutter(),
            drawSelection(),
            dropCursor(),
            EditorState.allowMultipleSelections.of(true),
            indentOnInput(),
            syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
            bracketMatching(),
            closeBrackets(),
            autocompletion(),
            rectangularSelection(),
            crosshairCursor(),
            highlightActiveLine(),
            highlightSelectionMatches(),
            keymap.of([
                ...closeBracketsKeymap,
                ...defaultKeymap,
                ...searchKeymap,
                ...historyKeymap,
                ...foldKeymap,
                ...completionKeymap,
                ...lintKeymap,
                indentWithTab,
            ]),
            nginxLanguage,
            EditorView.updateListener.of(handleChange),
            EditorState.readOnly.of(readOnly),
        ];

        // 添加深色主题
        if (isDark) {
            extensions.push(oneDark);
        }

        const state = EditorState.create({
            doc: value,
            extensions,
        });

        const view = new EditorView({
            state,
            parent: editorRef.current,
        });

        viewRef.current = view;

        return () => {
            view.destroy();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [readOnly]);

    // 当外部 value 变化时更新编辑器内容
    useEffect(() => {
        if (viewRef.current) {
            const currentValue = viewRef.current.state.doc.toString();
            if (currentValue !== value) {
                viewRef.current.dispatch({
                    changes: {
                        from: 0,
                        to: currentValue.length,
                        insert: value,
                    },
                });
            }
        }
    }, [value]);

    return (
        <div
            ref={editorRef}
            className="border rounded-md"
            style={{ height }}
        />
    );
}
