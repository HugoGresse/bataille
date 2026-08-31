/**
 * Release step run by CI on every merge to main: bump the patch version and turn the merge commit
 * into the next changelog entry (shown in the app on /changelog).
 *
 * When OPENROUTER_API_KEY is set the entry title is rewritten into a short player-facing line from
 * the PR title and description (same approach as plantnet-mobile's draftRelease.mjs); without the
 * key, or on any failure, the merge commit subject is used verbatim.
 *
 * Exits 0 without changing anything when HEAD is already a release commit, so the workflow can run
 * it unconditionally.
 */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'

const CHANGELOG_PATH = new URL('../src/client/changelog/changelog.json', import.meta.url)

const { GITHUB_TOKEN, OPENROUTER_API_KEY } = process.env
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || 'HugoGresse/bataille'
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-v4-flash'
const useAi = process.env.USE_AI !== 'false'

const run = (command) => execSync(command, { encoding: 'utf8' }).trim()

const fetchPrDescription = async (pr) => {
    if (!GITHUB_TOKEN) {
        return null
    }
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}/pulls/${pr}`, {
        headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
    })
    if (!res.ok) {
        throw new Error(`GitHub API -> ${res.status}`)
    }
    const data = await res.json()
    return (data.body ?? '').slice(0, 1200)
}

const rewriteTitle = async (title, pr) => {
    const description = pr ? await fetchPrDescription(pr).catch(() => null) : null
    const prompt = [
        'Rewrite this merged pull request as ONE short changelog line for players of a multiplayer',
        'risk-like browser game. Plain text, no markdown, at most 90 characters, no trailing period.',
        'Describe what changed for the player, not how. Do not invent anything.',
        '',
        `PR title: ${title}`,
        description ? `PR description:\n${description}` : '(no description)',
    ].join('\n')

    // Bound the call so a stalled upstream falls back to the verbatim subject quickly
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)
    let res
    try {
        res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': `https://github.com/${GITHUB_REPOSITORY}`,
                'X-Title': 'Bataille changelog',
            },
            body: JSON.stringify({
                model: OPENROUTER_MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2,
            }),
            signal: controller.signal,
        })
    } finally {
        clearTimeout(timeout)
    }
    if (!res.ok) {
        throw new Error(`OpenRouter -> ${res.status} ${await res.text()}`)
    }
    const data = await res.json()
    const content = data.choices?.[0]?.message?.content?.trim()
    if (!content || content.length > 160) {
        throw new Error('OpenRouter returned an empty or oversized line')
    }
    return content.replace(/^["'\s]+|["'\s.]+$/g, '')
}

const subject = run('git log -1 --format=%s')
if (/^release:/.test(subject)) {
    console.log('HEAD is a release commit, nothing to do')
    process.exit(0)
}

run('npm version patch --no-git-tag-version')
const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version

const prMatch = subject.match(/\(#(\d+)\)\s*$/)
const pr = prMatch ? Number(prMatch[1]) : null
const rawTitle = subject.replace(/\s*\(#\d+\)\s*$/, '')

let title = rawTitle
if (OPENROUTER_API_KEY && useAi) {
    try {
        title = await rewriteTitle(rawTitle, pr)
        console.log(`Rewrote the entry with ${OPENROUTER_MODEL}`)
    } catch (error) {
        console.warn(`OpenRouter rewrite failed, keeping the commit subject: ${error.message}`)
    }
}

const entry = {
    version,
    date: new Date().toISOString().slice(0, 10),
    title,
    pr,
}

const entries = JSON.parse(readFileSync(CHANGELOG_PATH, 'utf8'))
entries.unshift(entry)
writeFileSync(CHANGELOG_PATH, JSON.stringify(entries, null, 4) + '\n')

console.log(`v${version}: ${entry.title}${entry.pr ? ` (#${entry.pr})` : ''}`)
