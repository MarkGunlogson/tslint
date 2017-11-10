/**
 * @license
 * Copyright 2016 Palantir Technologies, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as ts from "typescript";
import * as Lint from "../index";

const ONLY_WHITESPACE = /^\s*$/;

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "file-header",
        description: "Enforces a certain header comment for all files, matched by a regular expression.",
        optionsDescription: Lint.Utils.dedent`
            The first option, which is mandatory, is a regular expression that all headers should match.
            The second argument, which is optional, is a string that should be inserted as a header comment
            if fixing is enabled and no header that matches the first argument is found.`,
        options: {
            type: "array",
            items: [
                {
                    type: "string",
                },
                {
                    type: "string",
                },
            ],
            additionalItems: false,
            minLength: 1,
            maxLength: 2,
        },
        optionExamples: [[true, "Copyright \\d{4}", "Copyright 2017"]],
        hasFix: true,
        type: "style",
        typescriptOnly: false,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static FAILURE_STRING = "missing file header";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        const { text } = sourceFile;
        const headerFormat = new RegExp(this.ruleArguments[0] as string);
        const textToInsert = this.ruleArguments[1] as string | undefined;

        // ignore shebang if it exists
        let offset = text.startsWith("#!") ? text.indexOf("\n") : 0;
        // returns details about the first comment or undefined
        const commentDetails  = ts.forEachLeadingCommentRange(
            text,
            offset,
            (pos, end, kind) => ({pos, end, kind}));

        if (offset !== 0) {
            ++offset; // show warning in next line after shebang
        }

        if (commentDetails === undefined) {
            const fix = textToInsert !== undefined
                ? Lint.Replacement.appendText(offset, this.createComment(sourceFile, textToInsert))
                : undefined;
            return [new Lint.RuleFailure(sourceFile, offset, offset, Rule.FAILURE_STRING, this.ruleName, fix)];
        } else {
            const { pos, end, kind } = commentDetails;
            const commentText = text.substring(pos, kind === ts.SyntaxKind.SingleLineCommentTrivia ? end : end - 2);
            if (!headerFormat.test(commentText)) {
                const isFirstCommentAHeader = ONLY_WHITESPACE.test(text.substring(offset, pos));
                const fix = textToInsert !== undefined
                    ? isFirstCommentAHeader
                        ? Lint.Replacement.replaceFromTo(pos, end, this.createComment(sourceFile, textToInsert, 0))
                        : Lint.Replacement.appendText(offset, this.createComment(sourceFile, textToInsert))
                    : undefined;
                return [new Lint.RuleFailure(sourceFile, offset, offset, Rule.FAILURE_STRING, this.ruleName, fix)];
            }
        }
        return [];
    }

    private createComment(sourceFile: ts.SourceFile, commentText: string, trailingNewlines = 2) {
        const maybeCarriageReturn = sourceFile.text[sourceFile.getLineEndOfPosition(0)] === "\r" ? "\r" : "";
        const lineEnding = `${maybeCarriageReturn}\n`;
        return [
            "/*",
            ...commentText.split(lineEnding).map((line) => ` * ${line}`),
            " */",
        ].join(lineEnding) + lineEnding.repeat(trailingNewlines);
    }
}
