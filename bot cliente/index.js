const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const token = process.env.TOKEN;

if (!config.token || !config.clientId) {
    console.error('❌ ERRO CRÍTICO: Token ou clientId não configurados no config.json!');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const FILAS_FILE = './filas.json';
let filasAtivas = new Map();
let confirmacoesPartida = new Map();

function salvarDados() {
    const dados = {
        filas: Array.from(filasAtivas.entries()),
        confirmacoes: Array.from(confirmacoesPartida.entries())
    };
    fs.writeFileSync(FILAS_FILE, JSON.stringify(dados, null, 2));
}

function carregarDados() {
    try {
        if (fs.existsSync(FILAS_FILE)) {
            const conteudo = fs.readFileSync(FILAS_FILE, 'utf-8');
            if (conteudo.trim() === '' || conteudo.trim() === '{}') return;
            
            const dados = JSON.parse(conteudo);
            if (dados.filas) filasAtivas = new Map(dados.filas);
            if (dados.confirmacoes) confirmacoesPartida = new Map(dados.confirmacoes);
            console.log('📦 Dados de filas e partidas persistidas carregados com sucesso!');
        }
    } catch (error) {
        console.error('⚠️ Erro ao carregar arquivo de filas:', error);
    }
}

// ==========================================
// 🛠️ FUNÇÃO AUXILIAR DE LOGS GERAIS
// ==========================================
async function enviarLogGeral(guild, titulo, descricao, cor = '#ff0000') {
    const canalLogId = config.canalLogsGeralId;
    if (!canalLogId) return;
    const canalLog = guild.channels.cache.get(canalLogId);
    if (!canalLog) return;

    const embedLog = new EmbedBuilder()
        .setTitle(`🛠️ LOG | ${titulo}`)
        .setDescription(descricao)
        .setColor(cor)
        .setTimestamp();

    await canalLog.send({ embeds: [embedLog] }).catch(() => {});
}

// ==========================================
// 🚀 REGISTRO DE TODOS OS COMANDOS EM BARRA (/)
// ==========================================
const commands = [
    new SlashCommandBuilder()
        .setName('gerarfilas')
        .setDescription('Envia o painel mestre com múltiplos valores do maior para o menor.')
        .addStringOption(option => 
            option.setName('formato')
                .setDescription('Selecione o formato para todas as filas geradas')
                .setRequired(true)
                .addChoices(
                    { name: '1x1', value: '1x1' },
                    { name: '2x2', value: '2x2' },
                    { name: '3x3', value: '3x3' },
                    { name: '4x4', value: '4x4' }
                )
        ),

    new SlashCommandBuilder()
        .setName('filas')
        .setDescription('Cria um painel individual de fila de apostas.')
        .addStringOption(option => 
            option.setName('formato')
                .setDescription('Selecione o formato della partida')
                .setRequired(true)
                .addChoices(
                    { name: '1x1', value: '1x1' },
                    { name: '2x2', value: '2x2' },
                    { name: '3x3', value: '3x3' },
                    { name: '4x4', value: '4x4' }
                )
        )
        .addStringOption(option => 
            option.setName('valor')
                .setDescription('Digite o valor por pessoa da aposta (Exemplo: 5 ou 10)')
                .setRequired(true)
        ),
        
    new SlashCommandBuilder()
        .setName('painelticket')
        .setDescription('Envia o painel de atendimento Boss com menu de seleção.'),
        
    new SlashCommandBuilder()
        .setName('limpar')
        .setDescription('Limpa uma quantidade específica de mensagens do canal atual.')
        .addIntegerOption(option => 
            option.setName('quantidade')
                .setDescription('Número de mensagens a apagar (máximo 100)')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bane um membro do servidor.')
        .addUserOption(option => option.setName('membro').setDescription('Membro a ser banido').setRequired(true))
        .addStringOption(option => option.setName('motivo').setDescription('Motivo do banimento')),
        
    new SlashCommandBuilder()
        .setName('desban')
        .setDescription('Remove o ban de um usuário pelo ID.')
        .addStringOption(option => option.setName('id').setDescription('ID do usuário no Discord').setRequired(true)),
        
    new SlashCommandBuilder()
        .setName('mut')
        .setDescription('Muta um membro temporariamente por 1 hora.')
        .addUserOption(option => option.setName('membro').setDescription('Membro a ser mutado').setRequired(true)),
        
    new SlashCommandBuilder()
        .setName('desmut')
        .setDescription('Remove o mut de um membro.')
        .addUserOption(option => option.setName('membro').setDescription('Membro a ser desmutado').setRequired(true)),
        
    new SlashCommandBuilder()
        .setName('anuncio')
        .setDescription('Envia um anúncio formal marcando @everyone.')
        .addStringOption(option => option.setName('texto').setDescription('Conteúdo do anúncio').setRequired(true)),

    new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Bloqueia o canal atual para que membros não possam enviar mensagens.'),

    new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Desbloqueia o canal atual permitindo o envio de mensagens novamente.')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(config.token);

client.once('ready', async () => {
    console.log(`🚀 ${client.user.tag} conectado com sucesso!`);
    carregarDados();
    try {
        await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
        console.log('✅ Todos os comandos em barra (/) foram registrados no estilo Boss!');
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }
});

// ==========================================
// 📥 CAPTURA DE INTERAÇÕES E COMANDOS
// ==========================================
client.on('interactionCreate', async (interaction) => {
    
    if (interaction.isChatInputCommand()) {
        const { commandName, options, member, guild, channel } = interaction;

        if (commandName === 'lock') {
            if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return interaction.reply({ content: '❌ Você não tem permissão para gerenciar canais.', ephemeral: true });
            }
            await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
            await interaction.reply({ content: '🔒 Este canal foi bloqueado com sucesso!' });
            return enviarLogGeral(guild, 'Canal Bloqueado', `**Canal:** ${channel}\n**Autor:** ${member.user}\n**Ação:** /lock`, '#ff5555');
        }

        if (commandName === 'unlock') {
            if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return interaction.reply({ content: '❌ Você não tem permissão para gerenciar canais.', ephemeral: true });
            }
            await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
            await interaction.reply({ content: '🔓 Este canal foi desbloqueado com sucesso!' });
            return enviarLogGeral(guild, 'Canal Desbloqueado', `**Canal:** ${channel}\n**Autor:** ${member.user}\n**Ação:** /unlock`, '#55ff55');
        }

        if (commandName === 'gerarfilas') {
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: '❌ Apenas administradores podem usar este comando.', ephemeral: true });
            }

            const formatoEscolhido = options.getString('formato');
            const valoresPadrao = [100, 50, 20, 10, 5, 1];

            await interaction.reply({ content: `⏳ Gerando painéis de apostas no formato **${formatoEscolhido}**...`, ephemeral: true });

            for (const valor of valoresPadrao) {
                const tituloFinal = `${formatoEscolhido} | R$${valor},00`;

                const embedFila = new EmbedBuilder()
                    .setTitle(tituloFinal)
                    .setDescription(`💣 **Gel Normal:**\nNenhum jogador na fila.\n\n💣 **Gel Inf:**\nNenhum jogador na fila.`)
                    .setColor('#ff0000')
                    .setImage('https://media.discordapp.net/attachments/1509731225324224632/1509752783643869317/ChatGPT_Image_28_de_mai._de_2026_23_58_17.png?ex=6a1afb19&is=6a19a999&hm=ac68f7234ebac064229df6c8fa90237b4e7167f92a0965d4e5d43ca0f74e6716&=&format=webp&quality=lossless&width=666&height=666');

                const botoesFila = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('fila_normal').setLabel('Gel Normal').setEmoji('💣').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('fila_inf').setLabel('Gel Inf').setEmoji('💣').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('fila_sair').setLabel('Sair').setEmoji('🚪').setStyle(ButtonStyle.Danger)
                );

                const msgFila = await channel.send({ embeds: [embedFila], components: [botoesFila] });
                filasAtivas.set(msgFila.id, { titulo: tituloFinal, formato: formatoEscolhido, valorIndividual: valor, normal: [], inf: [] });
            }

            salvarDados();
            await enviarLogGeral(guild, 'Painel Mestre Criado', `**Autor:** ${member.user}\n**Formato:** ${formatoEscolhido}`, '#00aeff');
            return interaction.editReply({ content: `✅ Todos os painéis de apostas no formato **${formatoEscolhido}** foram criados (R$100 até R$1)!` });
        }

        if (commandName === 'filas') {
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: '❌ Apenas administradores podem iniciar filas.', ephemeral: true });
            }

            const formato = options.getString('formato');
            let valorInput = options.getString('valor');

            const valorNumero = parseFloat(valorInput.replace('R$', '').replace(',', '.').trim());
            if (isNaN(valorNumero)) {
                return interaction.reply({ content: '❌ Insira um valor numérico válido (Ex: 5 ou 10).', ephemeral: true });
            }

            const tituloFinal = `${formato} | R$${valorNumero}`;

            const embedFila = new EmbedBuilder()
                .setTitle(tituloFinal)
                .setDescription(`💣 **Gel Normal:**\nNenhum jogador na fila.\n\n💣 **Gel Inf:**\nNenhum jogador na fila.`)
                .setColor('#ff0000')
                .setImage('https://media.discordapp.net/attachments/1509731225324224632/1509752783643869317/ChatGPT_Image_28_de_mai._de_2026_23_58_17.png?ex=6a1afb19&is=6a19a999&hm=ac68f7234ebac064229df6c8fa90237b4e7167f92a0965d4e5d43ca0f74e6716&=&format=webp&quality=lossless&width=666&height=666');

            const botoesFila = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('fila_normal').setLabel('Gel Normal').setEmoji('💣').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('fila_inf').setLabel('Gel Inf').setEmoji('💣').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('fila_sair').setLabel('Sair').setEmoji('🚪').setStyle(ButtonStyle.Danger)
            );

            const msgFila = await channel.send({ embeds: [embedFila], components: [botoesFila] });
            
            filasAtivas.set(msgFila.id, { titulo: tituloFinal, formato: formato, valorIndividual: valorNumero, normal: [], inf: [] });
            salvarDados();
            await enviarLogGeral(guild, 'Fila Individual Criada', `**Autor:** ${member.user}\n**Configuração:** ${tituloFinal}`, '#00aeff');
            return interaction.reply({ content: '✅ Fila iniciada com sucesso!', ephemeral: true });
        }

        if (commandName === 'painelticket') {
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
            const embedTicket = new EmbedBuilder().setTitle('❤️‍🔥 | Atendimento Boss').setDescription(`📢 **Suporte:** Tire dúvidas\n🗂️ **Falar com ADM:** Reembolsos\n💠 **Vagas Mediador:** Vagas\n\nCertifique-se de já ter lido as regras.`).setColor('#ff0000');
            const menuSelecao = new ActionRowBuilder().addComponents(new (require('discord.js').StringSelectMenuBuilder)().setCustomId('menu_ticket_boss').setPlaceholder('Selecione...').addOptions({ label: 'Suporte Geral', value: 'ticket_suporte', emoji: '📢' }, { label: 'Falar com ADM', value: 'ticket_adm', emoji: '🗂️' }, { label: 'Vagas Mediador', value: 'ticket_mediador', emoji: '💠' }));
            await channel.send({ embeds: [embedTicket], components: [menuSelecao] }); 
            await enviarLogGeral(guild, 'Painel de Ticket Gerado', `**Autor:** ${member.user}\n**Canal:** ${channel}`, '#ffaa00');
            return interaction.reply({ content: '✅ Painel enviado!', ephemeral: true });
        }

        if (commandName === 'limpar') {
            if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
            const quantidade = options.getInteger('quantidade');
            if (quantidade < 1 || quantidade > 100) return interaction.reply({ content: '❌ Entre 1 e 100.', ephemeral: true });
            const mensagensApagadas = await channel.bulkDelete(quantidade, true);
            await enviarLogGeral(guild, 'Mensagens Limpas', `**Autor:** ${member.user}\n**Canal:** ${channel}\n**Quantidade Solicitada:** ${quantidade}\n**Deletadas com sucesso:** ${mensagensApagadas.size}`, '#ffff00');
            return interaction.reply({ content: `🧹 Chat limpo! Escondi **${mensagensApagadas.size}** mensagens.`, ephemeral: true });
        }

        if (commandName === 'ban') {
            if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
            const alvo = options.getMember('membro'); const motivo = options.getString('motivo') || 'Não informado';
            if (!alvo) return interaction.reply({ content: 'Membro inválido.', ephemeral: true });
            await alvo.ban({ reason: motivo }); 
            await enviarLogGeral(guild, 'Membro Banido 🔴', `**Autor:** ${member.user}\n**Alvo:** ${alvo.user.tag} (${alvo.id})\n**Motivo:** ${motivo}`, '#ff0000');
            return interaction.reply(`🔴 **${alvo.user.tag}** foi banido.`);
        }

        if (commandName === 'desban') {
            if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
            const idUsuario = options.getString('id');
            try { 
                await guild.members.unban(idUsuario); 
                await enviarLogGeral(guild, 'Membro Desbanido 🟢', `**Autor:** ${member.user}\n**ID do Usuário:** ${idUsuario}`, '#00ff00');
                return interaction.reply(`🟢 ID **${idUsuario}** desbanido.`); 
            } catch { return interaction.reply({ content: '❌ Erro.', ephemeral: true }); }
        }

        if (commandName === 'mut') {
            if (!member.permissions.has(PermissionsBitField.Flags.MuteMembers)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
            const alvo = options.getMember('membro'); if (!alvo) return interaction.reply({ content: 'Membro inválido.', ephemeral: true });
            await alvo.timeout(60 * 60 * 1000, 'Mutado via comando Boss.'); 
            await enviarLogGeral(guild, 'Membro Mutado 🤫', `**Autor:** ${member.user}\n**Alvo:** ${alvo.user.tag}`, '#ffaa00');
            return interaction.reply(`🤫 **${alvo.user.tag}** mutado.`);
        }

        if (commandName === 'desmut') {
            if (!member.permissions.has(PermissionsBitField.Flags.MuteMembers)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
            const alvo = options.getMember('membro'); if (!alvo) return interaction.reply({ content: 'Membro inválido.', ephemeral: true });
            await alvo.timeout(null); 
            await enviarLogGeral(guild, 'Membro Desmutado 🔊', `**Autor:** ${member.user}\n**Alvo:** ${alvo.user.tag}`, '#00ff00');
            return interaction.reply(`🔊 Castigo de **${alvo.user.tag}** removido.`);
        }

        if (commandName === 'anuncio') {
            if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
            const textoInserido = options.getString('texto');
            const embedTermos = new EmbedBuilder().setColor('#1c1b1c').setDescription(textoInserido);
            await channel.send({ content: '@everyone', embeds: [embedTermos] }); 
            await enviarLogGeral(guild, 'Anúncio Enviado', `**Autor:** ${member.user}\n**Canal:** ${channel}`, '#ffffff');
            return interaction.reply({ content: '✅ Anúncio enviado no formato Embed com sucesso!', ephemeral: true });
        }
    }

    if (interaction.isButton() && ['fila_normal', 'fila_inf', 'fila_sair'].includes(interaction.customId)) {
        const fila = filasAtivas.get(interaction.message.id);
        if (!fila) return interaction.reply({ content: '⚠️ Essa fila expirou ou o painel foi recriado.', ephemeral: true });

        const userId = interaction.user.id;
        fila.normal = fila.normal.filter(id => id !== userId);
        fila.inf = fila.inf.filter(id => id !== userId);

        let filaSelecionada = '';
        if (interaction.customId === 'fila_normal') { fila.normal.push(userId); filaSelecionada = 'normal'; }
        else if (interaction.customId === 'fila_inf') { fila.inf.push(userId); filaSelecionada = 'inf'; }

        const multiplicador = parseInt(fila.formato.split('x')[0]) || 1;
        const limiteJogadores = multiplicador * 2;
        const listaAtual = filaSelecionada === 'normal' ? fila.normal : fila.inf;

        if (filaSelecionada && listaAtual.length >= limiteJogadores) {
            await interaction.reply({ content: '🔥 A fila encheu! Criando a sala privada de apostas...', ephemeral: true });
            
            const jogadoresSairam = [...listaAtual];
            if (filaSelecionada === 'normal') fila.normal = []; else fila.inf = [];
            salvarDados();

            const overwritesPerms = [{ id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }];
            jogadoresSairam.forEach(id => { overwritesPerms.push({ id: id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }); });
            if (config.cargoMediadorId) overwritesPerms.push({ id: config.cargoMediadorId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] });

            const canalAposta = await interaction.guild.channels.create({
                name: `💸-aposta-${fila.formato}`,
                type: ChannelType.GuildText,
                permissionOverwrites: overwritesPerms
            });

            const mencaoJogadores = jogadoresSairam.map(id => `<@${id}>`).join(' ');
            const embedConfirmacao = new EmbedBuilder().setTitle(`⚔️ PARTIDA ENCONTRADA - ${fila.titulo}`).setDescription(`Atenção Jogadores!\n\nConfirme a presença abaixo.\n\n✅ **Confirmados:** 0 / ${limiteJogadores}`).setColor('#ff0000');
            const botaoConfirmar = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('confirmar_aposta').setLabel('Confirmar Presença').setEmoji('✅').setStyle(ButtonStyle.Success));

            const msgPainel = await canalAposta.send({ content: `${mencaoJogadores}`, embeds: [embedConfirmacao], components: [botaoConfirmar] });
            
            confirmacoesPartida.set(msgPainel.id, {
                jogadoresObrigatorios: [...jogadoresSairam],
                confirmados: [],
                limite: limiteJogadores,
                titulo: fila.titulo,
                valorIndividual: fila.valorIndividual,
                formatoEspecial: fila.formato 
            });

            const textoNormal = fila.normal.length > 0 ? fila.normal.map(id => `<@${id}>`).join('\n') : 'Nenhum jogador na fila.';
            const textoInf = fila.inf.length > 0 ? fila.inf.map(id => `<@${id}>`).join('\n') : 'Nenhum jogador na fila.';
            const embedReiniciado = new EmbedBuilder().setTitle(fila.titulo).setDescription(`💣 **Gel Normal:**\n${textoNormal}\n\n💣 **Gel Inf:**\n${textoInf}`).setColor('#ff0000').setImage('https://media.discordapp.net/attachments/1509731225324224632/1509752783643869317/ChatGPT_Image_28_de_mai._de_2026_23_58_17.png?ex=6a1afb19&is=6a19a999&hm=ac68f7234ebac064229df6c8fa90237b4e7167f92a0965d4e5d43ca0f74e6716&=&format=webp&quality=lossless&width=666&height=666');
            await interaction.message.edit({ embeds: [embedReiniciado] });
            salvarDados();
            return;
        }

        const textoNormal = fila.normal.length > 0 ? fila.normal.map(id => `<@${id}>`).join('\n') : 'Nenhum jogador na fila.';
        const textoInf = fila.inf.length > 0 ? fila.inf.map(id => `<@${id}>`).join('\n') : 'Nenhum jogador na fila.';
        const embedAtualizado = new EmbedBuilder().setTitle(fila.titulo).setDescription(`💣 **Gel Normal:**\n${textoNormal}\n\n💣 **Gel Inf:**\n${textoInf}`).setColor('#ff0000').setImage('https://media.discordapp.net/attachments/1509731225324224632/1509752783643869317/ChatGPT_Image_28_de_mai._de_2026_23_58_17.png?ex=6a1afb19&is=6a19a999&hm=ac68f7234ebac064229df6c8fa90237b4e7167f92a0965d4e5d43ca0f74e6716&=&format=webp&quality=lossless&width=666&height=666');
        await interaction.update({ embeds: [embedAtualizado] });
        salvarDados();
    }

    if (interaction.isButton() && interaction.customId === 'confirmar_aposta') {
        const partida = confirmacoesPartida.get(interaction.message.id);
        if (!partida) return interaction.reply({ content: '⚠️ Confirmação expirou.', ephemeral: true });

        const userId = interaction.user.id;
        if (!partida.jogadoresObrigatorios.includes(userId)) return interaction.reply({ content: '❌ Você não está nesta partida.', ephemeral: true });
        if (partida.confirmados.includes(userId)) return interaction.reply({ content: '⚠️ Já confirmou!', ephemeral: true });

        partida.confirmados.push(userId);

        if (partida.confirmados.length >= partida.limite) {
            const embedPronto = new EmbedBuilder().setTitle(`✅ TODAS AS CONFIRMAÇÕES RECEBIDAS!`).setDescription(`Status: **Pronto para o jogo**\n\nO Mediador foi acionado e está entrando na sala.`).setColor('#57F287');
            const botaoAssumir = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('assumir_mesa_boss').setLabel('Assumir Mesa').setEmoji('📥').setStyle(ButtonStyle.Primary));
            await interaction.update({ embeds: [embedPronto], components: [botaoAssumir] });
            return interaction.channel.send({ content: `🔔 <@&${config.cargoMediadorId}>, todos os jogadores confirmaram!` });
        }

        const listaMencionadaConfirmados = partida.confirmados.map(id => `<@${id}>`).join(', ');
        const embedAtualizada = new EmbedBuilder().setTitle(`⚔️ PARTIDA ENCONTRADA - ${partida.titulo}`).setDescription(`Atenção Jogadores!\n\n✅ **Confirmados (${partida.confirmados.length} / ${partida.limite}):**\n${listaMencionadaConfirmados}`).setColor('#ff0000');
        await interaction.update({ embeds: [embedAtualizada] });
        salvarDados();
    }

    if (interaction.isButton() && interaction.customId === 'assumir_mesa_boss') {
        if (!interaction.member.roles.cache.has(config.cargoMediadorId)) {
            return interaction.reply({ content: '❌ Apenas Mediadores!', ephemeral: true });
        }

        const mediadorId = interaction.user.id;
        let pixDoMediador = config.chavePixPadrao; 
        if (config.mediadores && config.mediadores[mediadorId]) pixDoMediador = config.mediadores[mediadorId];

        const partida = confirmacoesPartida.get(interaction.message.id);
        
        let formatoDetectado = '1x1';
        let valorFilaBase = 5;

        if (partida) {
            formatoDetectado = partida.formatoEspecial || '1x1';
            valorFilaBase = partida.valorIndividual;
            confirmacoesPartida.delete(interaction.message.id); 
            salvarDados();
        } else {
            const canalNome = interaction.channel.name; 
            formatoDetectado = canalNome.split('-')[2] || '1x1'; 
        }

        const multiplicador = parseInt(formatoDetectado.split('x')[0]) || 1;
        const totalJogadores = multiplicador * 2;
        
        const valorTotalDaSala = (valorFilaBase * totalJogadores);
        const valorComTaxa = valorTotalDaSala + 1;

        const embedMesaAssumida = new EmbedBuilder()
            .setTitle(`💼 MESA ASSUMIDA POR COMISSÃO`)
            .setDescription(
                `👮 **Mediador Responsável:** ${interaction.user}\n\n` +
                `Formato da Sala: **${formatoDetectado.toUpperCase()}**\n` +
                `Valor por Player: **R$${valorFilaBase},00**\n` +
                `Valor Total da Mesa: **R$${valorTotalDaSala},00**\n` +
                `Taxa de Mediação: **R$1,00**\n\n` +
                `💰 **VALOR TOTAL A PAGAR NO PIX: R$${valorComTaxa},00**\n\n` +
                `🔑 **CHAVE PIX DESTE MEDIADOR:**\n\`${pixDoMediador}\`\n\n` +
                `*Envie o comprovante aqui no chat para o mediador validar.*`
            )
            .setColor('#FEE75C')
            .setTimestamp();

        const botaoFecharCanal = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('fechar_sala_aposta').setLabel('Fechar Sala').setEmoji('🔒').setStyle(ButtonStyle.Danger));
        await interaction.update({ embeds: [embedMesaAssumida], components: [botaoFecharCanal] });
        return interaction.channel.send(`➡️ ${interaction.user} assumiu o controle e gerou sua chave Pix individual.`);
    }

    if (interaction.isButton() && interaction.customId === 'fechar_sala_aposta') {
        if (!interaction.member.roles.cache.has(config.cargoMediadorId)) return interaction.reply({ content: '❌ Apenas Mediadores!', ephemeral: true });
        
        await interaction.reply('🔒 Extraindo histórico e deletando este canal em 5 segundos...');
        
        try {
            const mensagens = await interaction.channel.messages.fetch({ limit: 100 });
            let logsTexto = mensagens.reverse().map(m => `[${m.createdAt.toLocaleTimeString('pt-BR')}] ${m.author.tag}: ${m.content || '[Embed/Arquivo]'}`).join('\n');
            
            const logFilasId = config.canalLogsFilasId;
            if (logFilasId) {
                const canalDestino = interaction.guild.channels.cache.get(logFilasId);
                if (canalDestino) {
                    if (logsTexto.length > 1900) {
                        const buffer = Buffer.from(logsTexto, 'utf-8');
                        await canalDestino.send({
                            content: `📦 **LOG DE CONVERSA | SALA DE APOSTA FECHADA**\n**Canal:** \`${interaction.channel.name}\`\n**Fechado por:** ${interaction.user}`,
                            files: [{ attachment: buffer, name: `log-${interaction.channel.name}.txt` }]
                        });
                    } else {
                        const embedHistorico = new EmbedBuilder()
                            .setTitle(`📦 LOG DE CONVERSA | SALA FECHADA`)
                            .setDescription(`**Canal:** \`${interaction.channel.name}\`\n**Fechado por:** ${interaction.user}\n\n**Histórico:**\n\`\`\`text\n${logsTexto || 'Nenhuma mensagem de texto enviada.'}\n\`\`\``)
                            .setColor('#ff5500')
                            .setTimestamp();
                        await canalDestino.send({ embeds: [embedHistorico] });
                    }
                }
            }
        } catch (err) { console.error('Erro ao gerar log da sala:', err); }

        setTimeout(() => { interaction.channel.delete().catch(() => {}); }, 5000);
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_ticket_boss') {
        await interaction.deferReply({ ephemeral: true });
        const escolha = interaction.values[0];
        let nomeCanal = ''; let cargoVerId = '';
        if (escolha === 'ticket_suporte') { nomeCanal = `🎟️-suporte-${interaction.user.username}`; cargoVerId = config.cargoSuporteId; }
        else if (escolha === 'ticket_adm') { nomeCanal = `💵-adm-${interaction.user.username}`; cargoVerId = config.adminId; }
        else if (escolha === 'ticket_mediador') { nomeCanal = `💠-mediador-${interaction.user.username}`; cargoVerId = config.cargoMediadorId; }

        const overwritesPerms = [{ id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }, { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }];
        if (cargoVerId && cargoVerId.length > 5) overwritesPerms.push({ id: cargoVerId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] });

        const canalCriado = await interaction.guild.channels.create({ name: nomeCanal, type: ChannelType.GuildText, permissionOverwrites: overwritesPerms });
        const embedSuporte = new EmbedBuilder().setTitle('🎫 Atendimento Boss Iniciado').setDescription(`Olá ${interaction.user}, suporte iniciado.`).setColor('#ff0000');
        const botaoFecharTicket = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('fechar_atendimento_boss').setLabel('Fechar Suporte').setStyle(ButtonStyle.Danger));
        await canalCriado.send({ content: `${interaction.user} ${cargoVerId ? `<@&${cargoVerId}>` : ''}`, embeds: [embedSuporte], components: [botaoFecharTicket] });
        return interaction.editReply(`✅ Criado: ${canalCriado}`);
    }

    if (interaction.isButton() && interaction.customId === 'fechar_atendimento_boss') {
        await interaction.reply('🔒 Fechando e arquivando em 5 segundos...');
        
        try {
            const mensagens = await interaction.channel.messages.fetch({ limit: 100 });
            let logsTexto = mensagens.reverse().map(m => `[${m.createdAt.toLocaleTimeString('pt-BR')}] ${m.author.tag}: ${m.content || '[Embed/Arquivo]'}`).join('\n');
            
            const logFilasId = config.canalLogsFilasId;
            if (logFilasId) {
                const canalDestino = interaction.guild.channels.cache.get(logFilasId);
                if (canalDestino) {
                    if (logsTexto.length > 1900) {
                        const buffer = Buffer.from(logsTexto, 'utf-8');
                        await canalDestino.send({
                            content: `🎫 **LOG DE CONVERSA | TICKET FECHADO**\n**Ticket:** \`${interaction.channel.name}\`\n**Fechado por:** ${interaction.user}`,
                            files: [{ attachment: buffer, name: `ticket-${interaction.channel.name}.txt` }]
                        });
                    } else {
                        const embedHistorico = new EmbedBuilder()
                            .setTitle(`🎫 LOG DE CONVERSA | TICKET FECHADO`)
                            .setDescription(`**Ticket:** \`${interaction.channel.name}\`\n**Fechado por:** ${interaction.user}\n\n**Histórico:**\n\`\`\`text\n${logsTexto || 'Nenhuma mensagem escrita.'}\n\`\`\``)
                            .setColor('#a83294')
                            .setTimestamp();
                        await canalDestino.send({ embeds: [embedHistorico] });
                    }
                }
            }
        } catch (err) { console.error('Erro ao salvar log do ticket:', err); }

        setTimeout(() => { interaction.channel.delete().catch(() => {}); }, 5000);
    }
});

client.on('guildMemberAdd', async (member) => {
    const canalId = config.canalBoasVindasId;
    if (!canalId) return;

    const canal = member.guild.channels.cache.get(canalId);
    if (!canal) return;

    const embedBoasVindas = new EmbedBuilder()
        .setTitle('👋 BEM-VINDO AO BOSS APOSTAS!')
        .setDescription(`Olá ${member}, seja muito bem-vindo(a) ao nosso servidor!\n\n🚀 **Pronto para jogar?**\n➜ Vá até o canal de filas e escolha seu formato.\n➜ Não esqueça de ler nossos **Termos de Uso** para evitar punições.\n\n🎮 Jogue limpo e boa sorte nas apostas!`)
        .setColor('#1c1b1c') 
        .setThumbnail(member.user.displayAvatarURL({ forceStatic: false })) 
        .setTimestamp();

    await canal.send({ content: `👑 Ei ${member}, você acabou de entrar!`, embeds: [embedBoasVindas] }).catch(console.error);
});

const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot esta online!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

client.login(process.env.TOKEN);
