const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-atendimento')
        .setDescription('Envia o painel de suporte com menu de seleção.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Apenas Admins usam

    async execute(interaction) {
        // Criando o Embed principal
        const embedAtendimento = new EmbedBuilder()
            .setColor('#FF2A35')
            .setTitle('🎫 | Atendimento BOSS')
            .setDescription(
                '📢 **Suporte:** Tire dúvidas e fale com nossa equipe de suporte.\n' +
                '🪙 **Falar com ADM:** Resolva questões de reembolso ou pagamento.\n' +
                '💠 **Vagas Mediador:** Garanta sua vaga como mediador e esclareça todas as suas dúvidas.\n\n' +
                'Certifique-se de já ter lido as **regras** do nosso servidor.'
            );

        // Criando o Menu de Seleção (Dropdown)
        const menuSelecao = new StringSelectMenuBuilder()
            .setCustomId('menu_atendimento')
            .setPlaceholder('Selecione o tipo de suporte...')
            .addOptions([
                {
                    label: 'Suporte',
                    value: 'atend_suporte',
                    emoji: '📢'
                },
                {
                    label: 'Falar com ADM',
                    value: 'atend_adm',
                    emoji: '🪙'
                },
                {
                    label: 'Vagas Mediador',
                    value: 'atend_vagas',
                    emoji: '💠'
                }
            ]);

        const linhaComponente = new ActionRowBuilder().addComponents(menuSelecao);

        // Responde ao comando e envia o painel no canal
        await interaction.reply({ content: '✅ Painel gerado com sucesso!', ephemeral: true });
        await interaction.channel.send({ embeds: [embedAtendimento], components: [linhaComponente] });
    },
};