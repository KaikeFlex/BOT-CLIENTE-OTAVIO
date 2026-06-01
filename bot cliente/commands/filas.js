const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('filas')
        .setDescription('Cria uma nova fila de aposta para Free Fire.')
        .addStringOption(option =>
            option.setName('modalidade')
                .setDescription('Escolha a modalidade (Ex: 1x1 Mobile, 4x4 Emulador)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('valor')
                .setDescription('Valor da aposta (Ex: R$3,00 ou 3.00)')
                .setRequired(true)),

    async execute(interaction) {
        const modalidade = interaction.options.getString('modalidade');
        let valor = interaction.options.getString('valor');

        // Formatação simples para garantir que exiba "R$" bonito se o usuário esquecer de digitar
        if (!valor.toUpperCase().includes('R$')) {
            valor = `R$${valor}`;
        }

        // Criando o design idêntico ao do print (Embed)
        const embedFila = new EmbedBuilder()
            .setColor('#FF2A35') // Cor da barra lateral esquerda (Vermelho)
            .setTitle(`${modalidade} | ${valor}`)
            .addFields(
                { name: '💣 Gel Normal:', value: 'Nenhum jogador na fila.', inline: false },
                { name: '💣 Gel Inf:', value: 'Nenhum jogador na fila.', inline: false }
            )
            .setThumbnail('https://cdn.discordapp.com/attachments/1509749102286606346/1509761695910727751/ChatGPT_Image_28_de_mai._de_2026_23_58_17.png?ex=6a1a5aa6&is=6a190926&hm=e489bd9faee4f9ea6fcfd1666fd29fe7af765fe40a23fa1dae779add7502681d'); // Substitua pela URL da imagem quadrada que aparece na direita

        // Criando os botões interativos de baixo
        const botoes = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('entrar_gel_normal')
                .setLabel('Gel Normal')
                .setEmoji('💣') // Você pode trocar pelo ID do emoji personalizado do gelo se tiver
                .setStyle(ButtonStyle.Secondary), // Botão escuro/cinza

            new ButtonBuilder()
                .setCustomId('entrar_gel_inf')
                .setLabel('Gel Inf')
                .setEmoji('💣')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('sair_fila')
                .setLabel('Sair')
                .setEmoji('🚪')
                .setStyle(ButtonStyle.Danger) // Botão vermelho
        );

        // Envia o painel no chat
        await interaction.reply({ embeds: [embedFila], components: [botoes] });
    },
};