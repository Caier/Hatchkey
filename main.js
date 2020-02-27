'use strict'
const Discord = require('discord.js');

class Hatchkey extends Discord.Client {
    constructor(options = {}) {
        super();
        this.reqVars = ["TOKEN", "SERVERID"];
        this.reqPerms = ['MANAGE_ROLES', 'CHANGE_NICKNAME', 'MANAGE_MESSAGES'];
        this.embColor = '#FFFFFE';
        this.vars = Object.assign({}, process.env, options);
        this._assertVars();
        this._start();
    }

    _assertVars() {
        let missVars = this.reqVars.filter(v => !this.vars[v]);
        if(missVars != 0)
            throw Error("Missing some requred variables: " + missVars.join(", "));
    }

    _start() {
        this.login(this.vars.TOKEN);
        this.on("ready", () => this._onReady());
        this.on("message", msg => this._onMessage(msg).catch(e => console.error(e)));
        this.on("error", err => console.error("Websocket error: " + err.message));
        this.on("reconnecting", () => console.log("Reconnecting to Discord..."));
    }

    _onReady() {
        console.log("Logged in to Discord as: " + this.user.tag);
        this.user.setActivity("emotes", "LISTENING");
    }

    async _onMessage(msg) {
        if(msg.author.bot || !msg.guild) return;
        if(!msg.guild.members.get(this.user.id).hasPermission(this.reqPerms)) {
            this.embMsg("Missing required role(s):\n" + this.reqPerms.filter(v => !msg.guild.members.get(this.user.id).permissions.toArray().includes(v)).join("\n"));
            return;
        }
        
        let rmsg = msg.content;

        for(let emoji of this.emotes.array())
            if(msg.content.includes(':' + emoji.name))
                rmsg = rmsg.replace(new RegExp(`:${emoji.name}:?`, 'g'), emoji);
        
        if(msg.content != rmsg) {
            await this._setAndCheckRoles(msg);
            msg.delete(150);
            await msg.guild.members.get(this.user.id).setNickname(msg.member.nickname || msg.author.username);
            await msg.guild.roles.find(v => v.name == "HatchColor").setColor((msg.member.colorRole || {}).color);
            await msg.channel.send(rmsg);
            await msg.guild.roles.find(v => v.name == "HatchColor").setColor('#000000');
            await msg.guild.members.get(this.user.id).setNickname("");
        }
    }

    async _setAndCheckRoles(msg) {
        if(!msg.guild.roles.find(v => v.name == 'HatchColor'))
            await msg.guild.createRole({name: "HatchColor"}); 
        if(!msg.guild.members.get(this.user.id).roles.find(v => v.name == "HatchColor"))
            await msg.guild.members.get(this.user.id).addRole(msg.guild.roles.find(v => v.name == 'HatchColor'));
    }

    get emotes() {
        let ownServer = this.guilds.get(process.env.SERVERID);
        if(!ownServer)
            throw Error("Can't connect to emoji server");
        return ownServer.emojis;
    }

    embMsg(message, color = this.embColor) {
        return new Discord.RichEmbed().setColor(color).setDescription(message);
    }
}

if(!module.parent) {
    require('dotenv').config();
    new Hatchkey();
}