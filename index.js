'use strict'
var Discord = require('discord.js'),
fs = require('fs'), ffmpeg = require('ffmpeg'),
FFMPEG_PATH = '/home/runner/audiobox/node_modules/ffmpeg-static/ffmpeg',
{ Client, MessageAttachment, MessageEmbed } = require('discord.js'),
client = new Discord.Client();

var audio = 'audio.ogg';
var reactions = ['⏮️', '⏸️', '⏹️', '▶️', '⏭️', '🔀', '🔁', '🔂', '🔉', '🔊', '🔇']
var jmsg = null
var dispatcher = null
var queueNum = 0
var vol=50

async function test(collector, msg, user){
  collector.on('collect', (reaction, reactionCollector) => {
    if (reaction.emoji.name === '⏮️'){
      back()
    }
    if (reaction.emoji.name === '⏸️'){
      pause(dispatcher)
      msg.reactions.get('⏸️').remove(reaction.user.name);
    }
    if (reaction.emoji.name === '⏹️'){
      stop(dispatcher)
    }
    if (reaction.emoji.name === '▶️'){
      resume(dispatcher)
    }
    if (reaction.emoji.name === '⏭️'){
      skip()
    }
    if (reaction.emoji.name === '🔀'){
      shuffle(queue1)
    }
    /*
    if (reaction.emoji.name === '🔁'){
      None
    }
    if (reaction.emoji.name === '🔂'){
      None
    }
    */
    if (reaction.emoji.name === '🔉'){
      volDown(dispatcher, vol)
    }
    if (reaction.emoji.name === '🔊'){
      volUp(dispatcher, vol)
    }
    if (reaction.emoji.name === '🔇'){
      None // !=Python
    }
  });
}

//The de-facto unbiased shuffle algorithm is the Fisher-Yates (aka Knuth) Shuffle.
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}


function createCollector(msg){
  const filter = (reaction, user) => reactions.includes(reaction.emoji.name);
  const collector = msg.createReactionCollector(filter);
  console.log('hi mom');
  console.log(collector);
  test(collector, msg, user)
  //collector.on('end', collected => console.log(`Collected ${collected.size} items`));
}


/*
function createCollector(msg){
  const filter = (reaction, user) => msg.author.bot!=true;
  const myCollector = new Discord.ReactionCollector(msg, filter);
  myCollector.on('collect', check_reaction(filter));
}
*/

function check_reaction(filter){
  console.log(filter.reaction)
  console.log(filter.user)
}

async function react(list, jmsg){
  for (var items of list){
    jmsg.react(items)
      .catch(console.error);
  }
  createCollector(jmsg)
  //const filter = (reaction, user) => jmsg.user.bot != True
  //jmsg.awaitReactions(filter)
}

function getTagColor(tag) {
  tag=tag.split('#')[1];
  var rtn = Number(tag).toString(16).substring(0,3);
  rtn = rtn[0]+rtn[0]+rtn[1]+rtn[1]+rtn[2]+rtn[2];
  while (rtn.length < 6) {rtn=rtn+tag[1];}
  return '#'+rtn;
}

function makeEmbed(color,title,desc,img,footer) {
  const e = new MessageEmbed()
    .setColor(color || '#222222')
    .setTitle(title || '')
    .setDescription(desc || '')
    .setFooter(footer || '')
  if (img) {e.setImage(img);}
  return e;
}

var Bot = {
  _pre: '!',
  _cmds: [],
  _sig: '~ imsosorrypls',
  _vars: {vCConnection: null, vC: null, queue1:[],},
  _init: function() {
    // don't forget to get rid of this ⬇ line before running
    //throw new Error('lol get roasted lol rofl');

    this._cmds = Object.keys(this).slice(7);
  },
  _check: function(m) {
    var txt = m.content;
    if (txt.indexOf(this._pre) == 0) {
		  txt=txt.substring(1).split(' ');
      if (this._cmds.indexOf(txt[0]) > -1) {
        this[txt[0]](txt,m);
      } else {
        m.reply(this._error(m.content));
      }
    }
  },
  _error: function(cmd) {
    return makeEmbed(
            '#DD1111',
            'Oops!',
            'Error in command/input: "'+cmd+'"; check spelling and/or parameters or user '+this._pre+'help for help.',
            '',
            this._sig
          );
  },
  help: function(params,m) {
    var rtn = 'Hello, "imsosorrypls" here. Command prefix is "'+this._pre+'", available commands:\n';
    for (var i of this._cmds) {rtn=rtn+this._pre+i+'\n';}
    m.reply(makeEmbed(
      getTagColor(m.author.tag),
      this._pre+'help',
      rtn,
      '',
      this._sig
    ));
  },
  ping: function(params,m) {
    m.reply(makeEmbed(getTagColor(m.author.tag),'Pong 🏓','','',this._sig));
  },
  join: function(params, m) {
    var member = m.guild.members.resolve(m.author);
    //var channel = m.channel
    //new Discord.VoiceState(m.guild);
    if (member) {
      var vc = member.voice.channel;
      if (vc && vc.join) {
        vc.join().then(connection => {
          this._vars.vC = vc;
          this._vars.vCConnection = connection;
          jmsg = m.channel.send(makeEmbed(getTagColor(m.author.tag),'Awaiting Song...','',''))
            .then((msg) => {react(reactions, msg)});
        });
      } else {
        throw new Error('Voice Channel not found!');
      }
    } else {
      throw new Error('Author not found in guild!');
    }
  },
  leave: function(params, m) {
    if (this._vars.vC) {
      this._vars.vC.leave();
      this._vars.vC = null;
    } else {
      throw new Error('I don\'t seem to be in a voice channel');
    }
  },
  playdemo: function(params, m) {
    if (Bot._vars.vCConnection) {
      dispatcher = Bot._vars.vCConnection.play(audio);
      dispatcher.on('start', () => {
        m.reply(makeEmbed(getTagColor(m.author.tag),'Started playing audio!','','',this._sig));
      });
      dispatcher.on('finish', () => {
        m.reply(makeEmbed(getTagColor(m.author.tag),'Audio playback completed!','','',this._sig));
        Bot._vars.vCConnection = null;
      });
      dispatcher.on('error', (e) => {
        console.log(e);
        Bot._vars.vCConnection = null;
      });
    } else {
      m.reply(makeEmbed(getTagColor(m.author.tag),'No voice channel found!','Join a voice channel first, then try again.','',this._sig));
    }
  },
  queue: function(params,m) {
    if (params.length > 1) {
      Bot._vars.queue1.push(params[1]);
      m.reply(makeEmbed(getTagColor(m.author.tag),'Queue updated!','Song "'+params[1]+'" added to queue','',this._sig));
    } else {
      m.reply(this._error('No songname specified!'));
    }
  },
}
Bot._init();

function pause(dispatcher){
  dispatcher.pause()
  console.log("hi")
}

function resume(dispatcher){
  dispatcher.resume()
}

function stop(dispatcher){
  dispatcher.stop()
}

function skip(){
  if (queueNum<queue1.length){
    queueNum+=1
  }
}

function back(){
  if (queueNum>0){
    queueNum-=1
  }
}

function setVol(dispatcher, vol){
  dispatcher.setVolume(vol)
}

function volUp(dispatcher, vol){
  vol+=5
  setVol(dispatcher,vol)
}

function volDown(dispatcher, vol){
  vol-=5
  setVol(dispatcher,vol)
}

/*
function mute(){
  a+=1
  if (a%2==0){
    b=true
  }
  if (a%2!=0){
    b=False
  }
  VoiceState.setMute(b)
}
*/

client.on('message', m => {
  if (m.author.bot != true) {
    try {
      Bot._check(m);
    } catch (e) {m.reply(Bot._error(m.content)); console.log(e);}
  }
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('Prefix:');
    console.log(String(Bot._pre));
    console.log('Commands:');
    console.log(String(Bot._cmds));
});

client.login(process.env.AUTH);
