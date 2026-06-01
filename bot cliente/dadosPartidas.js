const partidasAtivas = new Map();

module.exports = {
    criarPartida(ticketId, jogador1Id, jogador2Id, valorBase) {
        // Gera centavos aleatórios entre 01 e 99 para diferenciar o PIX
        const centavosAleatorios = Math.floor(Math.random() * 99) + 1;
        const centavosTexto = centavosAleatorios < 10 ? `0${centavosAleatorios}` : `${centavosAleatorios}`;
        
        // Limpa o valor base extraindo apenas os números principais
        const numeroLimpo = valorBase.replace(/[^0-9]/g, '');
        const valorInteiro = Math.floor(parseInt(numeroLimpo, 10) / 100) || 0;
        
        const valorPixFinal = `R$ ${valorInteiro},${centavosTexto}`;

        partidasAtivas.set(ticketId, {
            jogador1: jogador1Id,
            jogador2: jogador2Id,
            confirmados: [],
            valorPix: valorPixFinal
        });
    },
    getPartida(ticketId) {
        return partidasAtivas.get(ticketId);
    },
    deletarPartida(ticketId) {
        partidasAtivas.delete(ticketId);
    }
};