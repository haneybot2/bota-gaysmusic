const { Client, Util } = require('discord.js');
const Discord = require("discord.js");
const { TOKEN, PREFIX, GOOGLE_API_KEY } = require('./config');
const YouTube = require('simple-youtube-api');
const ytdl = require('ytdl-core');
const FFMPEG = require('ffmpeg');

const client = new Client({ disableEveryone: true });

const youtube = new YouTube(GOOGLE_API_KEY);

const queue = new Map();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  console.log('')
  console.log('')
  console.log('╔[═════════════════════════════════════════════════════════════════]╗')
  console.log(`[Start] ${new Date()}`);
  console.log('╚[═════════════════════════════════════════════════════════════════]╝')
  console.log('')
  console.log('╔[════════════════════════════════════]╗');
  console.log(`Logged in as * [ " ${client.user.username} " ]`);
  console.log('')
  console.log('Informations :')
  console.log('')
  console.log(`servers! [ " ${client.guilds.size} " ]`);
  console.log(`Users! [ " ${client.users.size} " ]`);
  console.log(`channels! [ " ${client.channels.size} " ]`);
  console.log('╚[════════════════════════════════════]╝')
  console.log('')
  console.log('╔[════════════]╗')
  console.log(' Bot Is Online')
  console.log('╚[════════════]╝')
  console.log('')
  console.log('')
});

client.on('warn', console.warn);

client.on('error', console.error);

client.on('ready', () => console.log('Yo this ready!'));

// client.on('disconnect', () => console.log('I just disconnected, making sure you know, I will reconnect now...'));

// client.on('reconnecting', () => console.log('I am reconnecting now!'));

client.on('message', async msg => { 
	if (msg.author.bot) return undefined;
	if (!msg.content.startsWith(PREFIX)) return undefined;

	const args = msg.content.split(' ');
	const searchString = args.slice(1).join(' ');
	const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
	const serverQueue = queue.get(msg.guild.id);

	let command = msg.content.toLowerCase().split(" ")[0];
	command = command.slice(PREFIX.length)

	if (command === `play`) {
		if (!msg.member.hasPermission('MANAGE_MESSAGES')) return;
		const voiceChannel = msg.member.voiceChannel;
		if (!voiceChannel) return msg.channel.send(':x:** You need to be in a voice channel**!');
		const permissions = voiceChannel.permissionsFor(msg.client.user);
		if (!permissions.has('CONNECT')) {
			return msg.channel.send(':no_entry_sign: **I am unable to connect **!');
		}
		if (!permissions.has('SPEAK')) {
			return msg.channel.send('**I can not speak in this room, please make sure that i have full perms for this**!');
		}
		if (!permissions.has('EMBED_LINKS')) {
			return msg.channel.sendMessage("**I do not have `EMBED LINKS` perm**!")
		}

		if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
			const playlist = await youtube.getPlaylist(url);
			const videos = await playlist.getVideos();
			for (const video of Object.values(videos)) {
				const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
				await handleVideo(video2, msg, voiceChannel, true); // eslint-disable-line no-await-in-loop
			}
			return msg.channel.send(`:white_check_mark: **${playlist.title}** Added to **.A-Queue**!`);
		} else {
			try {
				var video = await youtube.getVideo(url);
			} catch (error) {
				try {
					var videos = await youtube.searchVideos(searchString, 5);
					let index = 0;
					const embed1 = new Discord.RichEmbed()
				.setAuthor(`.A-Music`, `https://cdn.discordapp.com/attachments/481762378787323904/483620699412627466/1.png`)
			        .setDescription(`**Song selection** :
${videos.map(video2 => `[**${++index} **] \`${video2.title}\``).join('\n')}`)
					.setFooter("")
					msg.channel.sendEmbed(embed1).then(message =>{message.delete(20000)})
					
					
					try {
						var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {
							maxMatches: 1,
							time: 10000,
							errors: ['time']
						});
					} catch (err) {
						console.error(err);
						return msg.channel.send(':information_source: **No song selected to play**.');
					}
					const videoIndex = parseInt(response.first().content);
					var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
				} catch (err) {
					console.error(err);
					return msg.channel.send(':X: **I don`t get any search result**.');
				}
			}
			return handleVideo(video, msg, voiceChannel);
		}
	} else if (command === `skip`) {
		if (!msg.member.hasPermission('MANAGE_MESSAGES')) return;
		if (!msg.member.voiceChannel) return msg.channel.send(':x:**You are not in a voice channel**!');
		if (!serverQueue) return msg.channel.send(':information_source: **There is nothing playing that I could skip for you**.');
		serverQueue.connection.dispatcher.end('Skip command has been used!');
		return undefined;
	} else if (command === `stop`) {
		if (!msg.member.hasPermission('MANAGE_MESSAGES')) return;
		if (!msg.member.voiceChannel) return msg.channel.send(':x:**You are not in a voice channel**!');
		if (!serverQueue) return msg.channel.send(':information_source: **There is nothing playing that I could stop for you**.');
		serverQueue.songs = [];
		serverQueue.connection.dispatcher.end('Stop command has been used!');
		return msg.channel.send('k :disappointed_relieved:');
	} else if (command === `s`) {
		if (!msg.member.hasPermission('MANAGE_MESSAGES')) return;
		if (!msg.member.voiceChannel) return msg.channel.send(':x:**You are not in a voice channel**!');
		if (!serverQueue) return msg.channel.send(':information_source: **There is nothing playing that I could stop for you**.');
		serverQueue.songs = [];
		serverQueue.connection.dispatcher.end('Stop command has been used!');
		return msg.channel.send('k :disappointed_relieved:');
	} else if (command === `vol`) {
		if (!msg.member.hasPermission('MANAGE_MESSAGES')) return;
		if (!msg.member.voiceChannel) return msg.channel.send(':x:**You are not in a voice channel**!');
		if (!serverQueue) return msg.channel.send(':information_source: **There is nothing playing**.');
		if (!args[1]) return msg.channel.send(`:speaker: **Current volume is:** ${serverQueue.volume}`);
		serverQueue.volume = args[1];
		serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
		return msg.channel.send(`:loud_sound: **Volume:** ${args[1]}`);
	} else if (command === `np`) {
		if (!msg.member.hasPermission('MANAGE_MESSAGES')) return;
		if (!serverQueue) return msg.channel.send(':information_source: **There is nothing playing**.');
		const embedNP = new Discord.RichEmbed()
	.addField('🎶 Now playing :' , `${serverQueue.songs[0].title}`,true)
		return msg.channel.sendEmbed(embedNP);
	} else if (command === `queue`) {
		if (!msg.member.hasPermission('MANAGE_MESSAGES')) return;
		if (!serverQueue) return msg.channel.send(':information_source: **There is nothing playing**.');
		let index = 0;
		const embedqu = new Discord.RichEmbed()
	.setAuthor(`.A-Queue`, `https://cdn.discordapp.com/attachments/481762378787323904/483620699412627466/1.png`)
	.setTitle("**.A-Queue List :**")
	.addField('__Now Playing__  :musical_note: ' , `${serverQueue.songs[0].title}`,true)
	.addField(':musical_score:  __UP NEXT__ :musical_score: ' , `${serverQueue.songs.map(song => `**[${++index}] -** ${song.title}`).join('\n')}`)
		return msg.channel.sendEmbed(embedqu);
	} else if (command === `pause`) {
		if (!msg.member.hasPermission('MANAGE_MESSAGES')) return;
		if (serverQueue && serverQueue.playing) {
			serverQueue.playing = false;
			serverQueue.connection.dispatcher.pause();
			return msg.channel.send('⏸ **Paused the music for you**!');
		}
		return msg.channel.send(':information_source: **There is nothing playing**.');
	} else if (command === "resume") {
		if (!msg.member.hasPermission('MANAGE_MESSAGES')) return;
		if (serverQueue && !serverQueue.playing) {
			serverQueue.playing = true;
			serverQueue.connection.dispatcher.resume();
			return msg.channel.send('▶ **Resumed the music for you**!');
		}
		return msg.channel.send(':information_source: **There is nothing playing**.');
	}

	return undefined;
});

async function handleVideo(video, msg, voiceChannel, playlist = false) {
	const serverQueue = queue.get(msg.guild.id);
	console.log(video);
	
//	console.log('yao: ' + Util.escapeMarkdown(video.thumbnailUrl));
	const song = {
		id: video.id,
		title: Util.escapeMarkdown(video.title),
		url: `https://www.youtube.com/watch?v=${video.id}`
	};
	if (!serverQueue) {
		const queueConstruct = {
			textChannel: msg.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 5,
			playing: true
		};
		queue.set(msg.guild.id, queueConstruct);

		queueConstruct.songs.push(song);

		try {
			var connection = await voiceChannel.join();
			queueConstruct.connection = connection;
			play(msg.guild, queueConstruct.songs[0]);
		} catch (error) {
			console.error(`I could not join the voice channel: **${error}**`);
			queue.delete(msg.guild.id);
			return msg.channel.send(`I could not join the voice channel: **${error}**`);
		}
	} else {
		serverQueue.songs.push(song);
		console.log(serverQueue.songs);
		if (playlist) return undefined;
		else return msg.channel.send(`:white_check_mark: **${song.title}** Added to **.A-Queue**!`);
	}
	return undefined;
}

function play(guild, song) {
	const serverQueue = queue.get(guild.id);

	if (!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}
	console.log(serverQueue.songs);

	const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
		.on('end', reason => {
			if (reason === 'Stream is not generating quickly enough.') console.log('Song ended.');
			else console.log(reason);
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0]);
		})
		.on('error', error => console.error(error));
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

	serverQueue.textChannel.send(`:white_check_mark: .A-Music playing **${song.title}**`);
}

client.login(process.env.BOT_TOKEN);
