const { Client, Util } = require('discord.js');
const Discord = require("discord.js");
const { PREFIX, GOOGLE_API_KEY } = require('./config');
const YouTube = require('simple-youtube-api');
const ytdl = require('ytdl-core');
const FFMPEG = require('ffmpeg');
const child_process = require("child_process");
const dev = ['454527533279608852' , '' , '' , ''];
const client = new Client({ disableEveryone: true });
const youtube = new YouTube(GOOGLE_API_KEY);
const queue = new Map();
//console
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
//restart
client.on('message', message => {
if(message.content ==="!restart") {
      if (!dev.includes(message.author.id)) return;
        console.log(`⚠️ جاري اعادة تشغيل البوت... ⚠️`);
        client.destroy();
        child_process.fork(__dirname + "/bot.js");
        console.log(`تم اعادة تشغيل البوت`);
    }
  
  });

client.on('warn', console.warn);

client.on('error', console.error);

client.on('ready', () => console.log('Yo this ready!'));

// client.on('disconnect', () => console.log('I just disconnected, making sure you know, I will reconnect now...'));

// client.on('reconnecting', () => console.log('I am reconnecting now!'));

client.on('message', async msg => { // eslint-disable-line
	if (msg.author.bot) return undefined;
	if (!msg.content.startsWith(PREFIX)) return undefined;

	const args = msg.content.split(' ');
	const searchString = args.slice(1).join(' ');
	const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
	const serverQueue = queue.get(msg.guild.id);

	let command = msg.content.toLowerCase().split(" ")[0];
	command = command.slice(PREFIX.length)

	if (command === `play`) {
		const voiceChannel = msg.member.voiceChannel;
		if (!voiceChannel) return msg.channel.send('** You need to be in a voice channel :notes:**');
		const permissions = voiceChannel.permissionsFor(msg.client.user);
		if (!permissions.has('CONNECT')) {
			return msg.channel.send(':no_entry_sign: **I am unable to connect **');
		}
		if (!permissions.has('SPEAK')) {
			return msg.channel.send('I can not speak in this room, please make sure that i have full perms for this');
		}
		if (!permissions.has('EMBED_LINKS')) {
			return msg.channel.sendMessage("**I do not have `EMBED LINKS` perm**")
		}

		if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
			const playlist = await youtube.getPlaylist(url);
			const videos = await playlist.getVideos();
			for (const video of Object.values(videos)) {
				const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
				await handleVideo(video2, msg, voiceChannel, true); // eslint-disable-line no-await-in-loop
			}
			return msg.channel.send(` **${playlist.title}** :white_check_mark: **The video added**`);
		} else {
			try {
				var video = await youtube.getVideo(url);
			} catch (error) {
				try {
					var videos = await youtube.searchVideos(searchString, 5);
					let index = 0;
					const embed1 = new Discord.RichEmbed()
			        .setAuthor(`.A-GUYS`, `http://bl3rbe.net/up/qHnSfuc.png`)
			        .setDescription(`**Song selection:** :
${videos.map(video2 => `[**${++index} **] \`${video2.title}\``).join('\n')}`)
					.setFooter("")
					msg.channel.sendEmbed(embed1).then(message =>{message.delete(20000)})
					
					// eslint-disable-next-line max-depth
					try {
						var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {
							maxMatches: 1,
							time: 10000,
							errors: ['time']
						});
					} catch (err) {
						console.error(err);
						return msg.channel.send('**No song selected to play**');
					}
					const videoIndex = parseInt(response.first().content);
					var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
				} catch (err) {
					console.error(err);
					return msg.channel.send(':negative_squared_cross_mark: **I don`t get any search result**');
				}
			}
			return handleVideo(video, msg, voiceChannel);
		}
	} else if (command === `skip`) {
		if (!msg.member.voiceChannel) return msg.channel.send('** You need to be in a voice channel :notes:**');
		if (!serverQueue) return msg.channel.send('**There is nothing playing that I could skip for you.**');
		serverQueue.connection.dispatcher.end('**Skip command has been used!**');
		return undefined;
	} else if (command === `stop`) {
		if (!msg.member.voiceChannel) return msg.channel.send('** You need to be in a voice channel :notes:**');
		if (!serverQueue) return msg.channel.send('**There is nothing playing that I could stop for you.**');
		serverQueue.songs = [];
		serverQueue.connection.dispatcher.end('**Stop command has been used!**');
		return undefined;
	} else if (command === `s`) {
		if (!msg.member.voiceChannel) return msg.channel.send('** You need to be in a voice channel :notes:**');
		if (!serverQueue) return msg.channel.send('**There is nothing playing that I could stop for you.**');
		serverQueue.songs = [];
		serverQueue.connection.dispatcher.end('**Stop command has been used!**');
		return undefined;
	} else if (command === `vol`) {
		if (!msg.member.voiceChannel) return msg.channel.send('** You need to be in a voice channel :notes:**');
		if (!serverQueue) return msg.channel.send('**There is nothing playing.**');
		if (!args[1]) return msg.channel.send(`:loud_sound: __Current volume is__ **${serverQueue.volume}**`);
		serverQueue.volume = args[1];
		serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
		return msg.channel.send(`:speaker: volume **${args[1]}**`);
	} else if (command === `np`) {
		if (!serverQueue) return msg.channel.send('There is nothing on deck');
		const embedNP = new Discord.RichEmbed()
	.setDescription(`:notes: Now playing: **${serverQueue.songs[0].title}**`)
	.setFooter("")
		return msg.channel.sendEmbed(embedNP);
	} else if (command === `queue`) {
		
		if (!serverQueue) return msg.channel.send('There is nothing playing.');
		let index = 0;
		const embedqu = new Discord.RichEmbed()
	.setDescription(`**Songs Queue**

${serverQueue.songs.map(song => `**${++index} -** ${song.title}`).join('\n')}

**Now playing** ${serverQueue.songs[0].title}`)
	.setFooter(".A-GUYS")
		return msg.channel.sendEmbed(embedqu);
	} else if (command === `pause`) {
		if (serverQueue && serverQueue.playing) {
			serverQueue.playing = false;
			serverQueue.connection.dispatcher.pause();
			return msg.channel.send('Paused');
		}
		return msg.channel.send('There is nothing playing.');
	} else if (command === `resume`) {
		if (serverQueue && !serverQueue.playing) {
			serverQueue.playing = true;
			serverQueue.connection.dispatcher.resume();
			return msg.channel.send('Unpaused');
		}
		return msg.channel.send('There is nothing on deck');
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
			console.error(`I could not join the voice channel: ${error}`);
			queue.delete(msg.guild.id);
			return msg.channel.send(`I could not join the voice channel: ${error}`);
		}
	} else {
		serverQueue.songs.push(song);
		console.log(serverQueue.songs);
		if (playlist) return undefined;
		else return msg.channel.send(` **${song.title}** added to list`);
	}
	return undefined;
}

function play(guild, song) {
	const serverQueue = queue.get(guild.id);

	if (!song) {
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

	serverQueue.textChannel.send(`Starting: **${song.title}**`);
}

  client.on("message", async message => {
    if (message.author.bot) return;
    if (message.channel.type === "dm") return;
    if (!message.member.voiceChannel) return;
    let prefix = "!";
    let messageArray = message.content.split(" ");
    let command = messageArray[0];

if (command === `${prefix}join`) {
        message.member.voiceChannel.join()
    message.channel.send(':thumbsup: **Joined **')
};

});

client.login(process.env.BOT_TOKEN);
