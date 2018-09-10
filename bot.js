const Discord = require('discord.js');
const { Client, Util } = require('discord.js');
const { PREFIX, GOOGLE_API_KEY } = require('./config.js');
const YouTube = require('simple-youtube-api');
const ytdl = require('ytdl-core');
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

client.on('disconnect', () => console.log('I just disconnected, making sure you know, I will reconnect now...'));

client.on('reconnecting', () => console.log('I am reconnecting now!'));

client.on('message', async msg => { // eslint disable line
    if (msg.author.bot) return undefined;
    if (!msg.content.startsWith(PREFIX)) return undefined;
    const args = msg.content.split(' ');
    const searchString = args.slice(1).join(' ');
    const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
    const serverQueue = queue.get(msg.guild.id);
    let argsnot = msg.content.split(" ").slice(1);

    if (msg.content.startsWith(`${PREFIX}play`)) {
	if (!msg.member.hasPermission('MANAGE_MESSAGES')) return;
        console.log(`${msg.author.tag} has been used the ${PREFIX}play command in ${msg.guild.name}`);

        const voiceChannel = msg.member.voiceChannel;
        if (!voiceChannel) return msg.channel.send(":x:** You need to be in a voice channel**!");
		const permissions = voiceChannel.permissionsFor(msg.client.user);
		if (!permissions.has('CONNECT')) {
            return msg.channel.send(":no_entry_sign: **I am unable to connect **!");
		}
		if (!permissions.has('SPEAK')) {
			return msg.channel.send("**I can not speak in this room, please make sure that i have full perms for this**!");
                }
	        if (!argsnot[0]) {
                          return msg.channel.send("**:x: Please specify a filename.**");
                }
        
        if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
            const playlist = await youtube.getPlaylist(url);
            const videos = await playlist.getVideos();
            for (const video of Object.values(videos)) {
                const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
                await handleVideo(video2, msg, voiceChannel, true) // eslint-disable-line no-await-in-loop
            }
            return msg.channel.send(`:white_check_mark: \`\`${playlist.title}\`\` Added to **.A-Queue**!`);
        } else {
            try {
                var video = await youtube.getVideo(url);
            } catch (error) {
                try {
		    voiceChannel.join().then(connection => console.log('Connected!'));
                    var videos = await youtube.searchVideos(searchString, 5);
                    let index = 0;
                    const embed1 = new Discord.RichEmbed()
                    .setAuthor(`.A-Music`, `https://cdn.discordapp.com/attachments/481762378787323904/483620699412627466/1.png`)
		    .setTitle(`**Song selection** :`)
                    .setDescription(`${videos.map(video2 => `[**${++index} **] \`${video2.title}\``).join('\n')}`)
                    .setColor('BLACK')
		    
					msg.channel.sendEmbed(embed1).then(message =>{message.delete(20000)})
                    // eslint-disable-next-line max-depth
                    try {
                        var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {
                            maxMatches: 1,
                            time: 15000,
                            errors: ['time']
                        });
                    } catch (err) {
                        console.error(err);
                        return msg.channel.send(':information_source: **No song selected to play**.').then(message =>{message.delete(5000)})
                    }
                    const videoIndex = (response.first().content);
                    var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
                } catch (err) {
                    console.error(err);
                    return msg.channel.send(":x:  **I don`t get any search result**.").then(message =>{message.delete(5000)})
                }
            }

            return handleVideo(video, msg, voiceChannel);
        }
    } else if (msg.content.startsWith(`${PREFIX}skip`)) {
	if (!msg.member.hasPermission('MANAGE_MESSAGES')) return;
        console.log(`${msg.author.tag} has been used the ${PREFIX}skip command in ${msg.guild.name}`);
        if (!msg.member.voiceChannel) return msg.channel.send(":x:**You are not in a voice channel**!").then(message =>{message.delete(5000)})
        if (!serverQueue) return msg.channel.send(":information_source: **There is nothing playing that I could skip for you**.").then(message =>{message.delete(5000)})
        serverQueue.connection.dispatcher.end();
        return undefined;
    } else if (msg.content.startsWith(`${PREFIX}stop`)) {
	if (!msg.member.hasPermission('MANAGE_MESSAGES')) return;
        console.log(`${msg.author.tag} has been used the ${PREFIX}stop command in ${msg.guild.name}`);
        if (!msg.member.voiceChannel) return msg.channel.send(":x:**You are not in a voice channel**!").then(message =>{message.delete(5000)})
        if (!serverQueue) return msg.channel.send(":information_source: **There is nothing playing that I could stop for you**.").then(message =>{message.delete(5000)})
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end('Stop command has been used!');
        return msg.channel.send('k :cry:');
    } else if (msg.content.startsWith(`${PREFIX}vol`)) {
	if (!msg.member.hasPermission('MANAGE_MESSAGES')) return;
        console.log(`${msg.author.tag} has been used the ${PREFIX}volume command in ${msg.guild.name}`);
        if (!msg.member.voiceChannel) return msg.channel.send(":x:**You are not in a voice channel**!").then(message =>{message.delete(5000)})
        if (!serverQueue) return msg.channel.send(':information_source: **There is nothing playing**.').then(message =>{message.delete(5000)})
        if (!args[1]) return msg.channel.send(`:speaker: **Current volume is:** ${serverQueue.volume}`)
        serverQueue.volume = args[1];
        serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 100);
        return msg.channel.send(`:loud_sound: **Volume:** ${args[1]}`);
    } else if (msg.content.startsWith(`${PREFIX}queue`)) {
	if (!msg.member.hasPermission('MANAGE_MESSAGES')) return;
        console.log(`${msg.author.tag} has been used the ${PREFIX}queue command in ${msg.guild.name}`);
        if (!serverQueue) return msg.channel.send(':information_source: **no_more_Queue**.').then(message =>{message.delete(5000)})
	let index = 0;
	const embedqu = new Discord.RichEmbed()
	.setAuthor(`.A-Queue`, `https://cdn.discordapp.com/attachments/481762378787323904/483620699412627466/1.png`)
	.setTitle("**.A-Queue List :**")
	.addField('__Now Playing__  :musical_note: ' , `**${serverQueue.songs[0].title}**`,true)
	.addField(':musical_score:  __UP NEXT__ :musical_score: ' , `${serverQueue.songs.map(song => `**[${++index}] -** ${song.title}`).join('\n')}`)
	return msg.channel.sendEmbed(embedqu);
     }  else if (msg.content.startsWith(`${PREFIX}pause`)) {
	if (!msg.member.hasPermission('MANAGE_MESSAGES')) return;
        console.log(`${msg.author.tag} has been used the ${PREFIX}pause command in ${msg.guild.name}`);
        if (serverQueue && serverQueue.playing) {
            serverQueue.playing = false;
        serverQueue.connection.dispatcher.pause();
        return msg.channel.send('k :unamused:')
        }
        return msg.channel.send(':information_source: **There is nothing playing**.').then(message =>{message.delete(5000)})
    } else if (msg.content.startsWith(`${PREFIX}resume`)) {
	if (!msg.member.hasPermission('MANAGE_MESSAGES')) return;
        console.log(`${msg.author.tag} has been used the ${PREFIX}resume command in ${msg.guild.name}`);

        if (serverQueue && !serverQueue.playing) {
            serverQueue.playing =  true;
            serverQueue.connection.dispatcher.resume();
            return msg.channel.send('k :slight_smile:')
        }
        return msg.channel.send(':information_source: **There is nothing playing**.').then(message =>{message.delete(5000)})
    }

    return undefined;
});

async function handleVideo(video, msg, voiceChannel, playlist = false) {
    const serverQueue = queue.get(msg.guild.id);
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
                volume: 50,
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
                return msg.channel.send(`I could not join the voice channel: **${error}**!`);
            }
        } else {
            serverQueue.songs.push(song);
            if (playlist) return undefined;
            else return msg.channel.send(`:white_check_mark: \`\`${song.title}\`\` Added to **.A-Queue**!`)
        }
        return undefined;
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);

    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return serverQueue.textChannel.send(`:stop_button: **.A-Queue** finished!!`);
    }

    const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
        .on('end', () => {
            console.log('Song ended.');
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on('error', error => console.log(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 100);

    serverQueue.textChannel.send(`:white_check_mark: .A-Music playing **${song.title}**`)
}

client.login(process.env.BOT_TOKEN);
