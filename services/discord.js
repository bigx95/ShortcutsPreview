const djs = require("discord.js");

const utils = require("shortcuts.js");
const getShortcutDetails = require("../logging-gsd.js");

const semver = require("semver");
const escape = require("markdown-escape");

const { version } = require("./../package.json");

const getPreviewLink = require("../utils/preview-link.js");

module.exports = config => {
	const client = new djs.Client();

	client.on("message", msg => {
		if (msg.author.id !== client.user.id) {
			const words = msg.content.split(" ");
			
			const url = words.find(utils.idFromURL);
			const id = utils.idFromURL(url);
			
			if (id) {
				getShortcutDetails(config.log, id).then(async shortcut => {
					const embed = new djs.RichEmbed();

					const metadata = await shortcut.getMetadata();

					if (config.previewShortcutIcon) {
						embed.attachFile({
							attachment: shortcut.icon.downloadURL,
							name: "icon.png",
						});
					}
					embed.setAuthor("Shortcut: " + shortcut.name, config.previewShortcutIcon ? "attachment://icon.png" : null, shortcut.getLink());
					
					const description = [];
					
					// Add bolded long description, if there is one
					if (shortcut.longDescription) {
						description.push("**" + shortcut.longDescription + "**");
					}

					const icons = [];
					icons.push(`\\🔎 [Preview](${getPreviewLink(shortcut.id)})`);
					const coerced = semver.coerce(metadata.client.release)
					if (semver.satisfies(coerced, config.betaRange)) {
						icons.push("\\🐞 Shortcuts Beta v" + coerced);
					}
					
					description.push(icons.join("\n"));
					embed.setDescription(description.join("\n\n"));

					// Get a normal hex color from the icon color for the embed color
					const iconColor = shortcut.icon.color.toString(16).slice(0, 6);
					embed.setColor(iconColor);

					// Make the footer
					embed.setTimestamp(shortcut.creationDate);
					embed.setFooter(`ShortcutsPreview v${version}`);
					
					msg.channel.send("", embed).then(() => {
						config.log("Sent a preview for the '%s' shortcut.", shortcut.name);
					}).catch(() => {
						config.log("Couldn't send a preview for the '%s' shortcut.", shortcut.name);
					});
				});
			}
		}
	});

	client.login(config.token).then(() => {
		config.log("Connected to Discord.");
	}).catch(() => {
		config.log("Couldn't connect to Discord.");
	}); 
}
