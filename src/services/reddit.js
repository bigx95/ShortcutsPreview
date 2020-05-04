const snoowrap = require("snoowrap");
const snoostorm = require("snoostorm");

const utils = require("shortcuts.js");
const getShortcutDetails = require("../logging-gsd.js");

const semver = require("semver");
const escape = require("markdown-escape");

const { version, homepage } = require("../../package.json");

const getPreviewLink = require("../utils/preview-link.js");

function format(shortcut, metadata, betaRange, testSubreddit) {
	const msg = [];
	
	// Name of shortcut
	msg.push(`#### Shortcut: ${escape(shortcut.name)}`);
	
	if (shortcut.longDescription) {
		msg.push(">" + escape(shortcut.longDescription));
	}
	
	// Links to shortcut download and preview
	msg.push(`* ⬇️ [Download](${escape(shortcut.getLink())})`);
	msg.push(`* 🔎 [Preview](${getPreviewLink(shortcut.id)})`);

	const coerced = semver.coerce(metadata.client.release)
	if (semver.satisfies(coerced, betaRange)) {
		msg.push("* 🐞 Shortcuts Beta v" + coerced);
	}
	
	// Footer with meta info
	const testSubLink = testSubreddit ? ` • [Test me!](https://www.reddit.com/r/${testSubreddit})` : ""

	msg.push("---");
	msg.push(`ShortcutsPreview v${version}${testSubLink} • [Creator](https://www.reddit.com/user/haykam821) • [Source code](${homepage})`);
	
	return msg.join("\n\n");
}

module.exports = config => {
	const client = new snoostorm(new snoowrap(Object.assign(config.credentials, {
		userAgent: "ShortcutsPreview v" + version,
	})));

	const sub = Array.isArray(config.subreddits) ? config.subreddits.join("+") : config.subreddits;
	const stream = client.SubmissionStream({
		"subreddit": sub,
	});

	stream.on("submission", post => {
		if (!post.is_self) {
			const id = utils.idFromURL(post.url);
			if (id) {
				getShortcutDetails(config.log, id).then(async shortcut => {
					const metadata = await shortcut.getMetadata();

					post.reply(format(shortcut, metadata, config.betaRange, config.testSubreddit)).then(reply => {
						config.log("Sent a preview for the '%s' shortcut.", shortcut.name);
						reply.distinguish({
							status: true,
							sticky: true,
						}).then(() => {
							config.log("Pinned a preview for the '%s' shortcut.", shortcut.name);
						}).catch(() => {
							config.log("Couldn't pin a preview for the '%s' shortcut.", shortcut.name);
						});
					}).catch(() => {
						config.log("Couldn't send a preview for the '%s' shortcut.", shortcut.name);
					});
				});
			}
		}
	});
};
