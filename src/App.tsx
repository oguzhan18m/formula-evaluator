import "./App.css";
import CodeMirror, { EditorState } from "@uiw/react-codemirror";
import { mentions } from "@uiw/codemirror-extensions-mentions";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import getAutocompleteOptions from "./services/getAutocompleteOptions";
import { Decoration, ViewPlugin } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { evaluate } from "mathjs";
import { Button, Grid, Typography, useTheme } from "@mui/material";
import { useResultStore } from "./store/useResultStore";

function App() {
  const { palette } = useTheme();
  const [code, setCode] = useState("");
  const [mentionValues, setMentionValues] = useState<
    { name: string; value: string }[]
  >([]);

  // Zustand store
  const result = useResultStore((s) => s.result);
  const setResult = useResultStore((s) => s.setResult);

  // Queries
  const { data } = useQuery({
    queryKey: ["GET_AUTOCOMPLETE_OPTIONS"],
    queryFn: getAutocompleteOptions,
  });

  const mentionHighlightPlugin = useMemo(() => {
    return ViewPlugin.fromClass(
      class {
        // @ts-ignore
        constructor(view) {
          // @ts-ignore
          this.decorations = this.getDecorations(view);
        }
        // @ts-ignore
        update(update) {
          if (update.docChanged || update.viewportChanged) {
            // @ts-ignore
            this.decorations = this.getDecorations(update.view);
          }
        }

        // @ts-ignore
        getDecorations(view) {
          const builder = new RangeSetBuilder();
          const regex = /@\w+(?: \w+)* \d+/g;
          for (let { from, to } of view.visibleRanges) {
            let text = view.state.doc.sliceString(from, to);
            let match;
            while ((match = regex.exec(text))) {
              builder.add(
                from + match.index,
                from + match.index + match[0].length,
                Decoration.mark({
                  class: "mention-highlight",
                })
              );
            }
          }
          return builder.finish();
        }
      },
      {
        // @ts-ignore
        decorations: (v) => v.decorations,
      }
    );
  }, []);

  const cursorMovementPlugin = EditorState.transactionFilter.of((tr) => {
    if (
      !tr.selection ||
      !tr.selection.ranges ||
      tr.selection.ranges.length === 0
    ) {
      return tr;
    }

    const regex = /@\w+(?: \w+)* \d+/g;
    let newSelection = tr.selection;
    for (let range of tr.selection.ranges) {
      const line = tr.state.doc.lineAt(range.head);
      let match;
      while ((match = regex.exec(line.text))) {
        const start = line.from + match.index;
        const end = start + match[0].length;

        // If the cursor is at the start of a mention and moving right
        if (range.head > start && range.head < end) {
          newSelection = EditorState.create({
            doc: tr.state.doc,
            selection: { anchor: end },
            // @ts-ignore
            userEvent: "select.jumpOverMention",
          }).selection;
          break;
        }
      }
    }

    return newSelection.eq(tr.selection)
      ? tr
      : [tr, { selection: newSelection }];
  });

  const options = useMemo(
    () =>
      data?.map((d) => {
        return {
          label: `@${d?.name}`,
          displayLabel: d?.name,
          apply: (view: any, completion: any, from: number, to: number) => {
            const valueToInsert = `@${d?.name} `;
            view.dispatch({
              changes: { from, to, insert: valueToInsert },
              selection: { anchor: from + valueToInsert.length },
            });

            setMentionValues((prev) => [
              ...prev,
              {
                name: d?.name,
                value: String(d?.value),
              },
            ]);
          },
        };
      }),
    [data]
  );

  const evaluateExpression = () => {
    let formula = code;
    // @ts-ignore
    mentionValues.forEach(({ name, value }) => {
      const mention = `@${name}`;
      console.log({ mention });

      const regex = new RegExp(`\\${mention}`, "g");
      formula = formula.replace(regex, value);
    });
    console.log({ formula });

    try {
      const result = evaluate(formula);
      console.log({ result });

      setResult(result);
    } catch (error) {
      setResult("Error in expression");
    }
  };

  const lineLimitPlugin = (maxLines: number) => {
    // @ts-ignore
    return EditorState.transactionFilter.of((tr) => {
      const currentLines = tr.state.doc.lines;
      const newLines = tr.newDoc.lines;

      if (newLines > maxLines) {
        return null;
      }

      return tr;
    });
  };

  return (
    <Grid px={{ xs: 2, md: 8, lg: 16 }} py={12}>
      <Grid xs={12} mb={4}>
        <Typography
          variant="h4"
          display="flex"
          flexDirection="row"
          alignItems="center"
          color={
            result === "Error in expression" ? "error" : palette.success.main
          }
        >
          <Typography mr={2} variant="h4" fontWeight="bold" color={"primary"}>
            Result:{" "}
          </Typography>{" "}
          {result ?? "--"}
        </Typography>
      </Grid>
      <Grid xs={12}>
        <Typography variant="body2" color={"primary"}>
          Please type "@" to see the options
        </Typography>
        <CodeMirror
          value={code}
          style={{
            marginBottom: 40,
            borderRadius: 20,
            outline: "none",
          }}
          height="60px"
          onChange={(value) => setCode(value)}
          extensions={[
            mentions(options),
            mentionHighlightPlugin,
            cursorMovementPlugin,
            lineLimitPlugin(1),
          ]}
          basicSetup={{
            foldGutter: false,
            dropCursor: false,
            allowMultipleSelections: false,
            indentOnInput: false,
            highlightSelectionMatches: true,
            lineNumbers: false,
          }}
        />
      </Grid>
      <Grid
        xs={12}
        display="flex"
        alignItems="center"
        justifyContent="flex-end"
      >
        <Button size="large" variant="contained" onClick={evaluateExpression}>
          Evaluate
        </Button>
      </Grid>
    </Grid>
  );
}

export default App;
