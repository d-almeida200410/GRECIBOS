// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDUYi6zK0Wikn7GxNvXwlaZ0IDAWjeBPFA",
    authDomain: "sistemarefoco.firebaseapp.com",
    projectId: "sistemarefoco",
    storageBucket: "sistemarefoco.appspot.com",
    messagingSenderId: "575074315451",
    appId: "1:575074315451:web:46a990adb690b40e3a8d9e",
    measurementId: "G-0SVNNZGEF4"
};

// Inicialize o Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const { jsPDF } = window.jspdf;

document.addEventListener('DOMContentLoaded', function() {
    // Função segura para obter elementos
    const getElement = (id) => {
        const el = document.getElementById(id);
        if (!el) console.error(`Elemento não encontrado: ${id}`);
        return el;
    };

    // Elementos do DOM
    const elements = {
        alunoSelect: getElement('alunoSelect'),
        reciboForm: getElement('reciboForm'),
        gerarReciboBtn: getElement('gerarReciboBtn'),
        limparFormBtn: getElement('limparFormBtn'),
        reciboPreview: getElement('reciboPreview'),
        reciboNomeAluno: getElement('reciboNomeAluno'),
        reciboValor: getElement('reciboValor'),
        reciboMes: getElement('reciboMes'),
        reciboPeriodo: getElement('reciboPeriodo'),
        reciboDias: getElement('reciboDias'),
        reciboVencimento: getElement('reciboVencimento'),
        reciboPagamento: getElement('reciboPagamento'),
        reciboPlanoContratado: getElement('reciboPlanoContratado'),
        reciboPeriodoPlano: getElement('reciboPeriodoPlano'),
        reciboDataEmissao: getElement('reciboDataEmissao'),
        reciboCnpj: getElement('reciboCnpj'),
        downloadPdfBtn: getElement('downloadPdfBtn')
    };

    // Verificar elementos essenciais
    if (!elements.reciboForm || !elements.gerarReciboBtn) {
        console.error("Elementos essenciais não encontrados!");
        return;
    }

    // Variáveis
    let alunos = [];
    let alunoMesInicioPlano = {}; // Armazenar mês de início de cada aluno
    
    // Função para formatar o tipo de plano para exibição no recibo
    function formatarTipoPlanoParaRecibo(tipoPlano) {
        switch(tipoPlano) {
            case 'bimestral': return 'Bimestral (2 meses)';
            case 'semestral': return 'Semestral (6 meses)';
            case 'anual': return 'Anual (12 meses)';
            default: return 'Bimestral (2 meses)'; // Valor padrão
        }
    }
    
    // Função para obter a duração em meses do plano
    function getDuracaoPlanoMeses(tipoPlano) {
        switch(tipoPlano) {
            case 'bimestral': return 2;
            case 'semestral': return 6;
            case 'anual': return 12;
            default: return 2; // padrão bimestral
        }
    }
    
    // Função para calcular o período RESTANTE do plano baseado no mês atual
    function calcularPeriodoRestantePlano(alunoId, mesReferencia, tipoPlano) {
        if (!mesReferencia || !tipoPlano) return '';
        
        const [anoAtual, mesAtual] = mesReferencia.split('-').map(Number);
        const duracaoTotal = getDuracaoPlanoMeses(tipoPlano);
        
        // Obter ou determinar o mês de início do plano
        let mesInicio, anoInicio;
        
        if (alunoMesInicioPlano[alunoId]) {
            // Se já temos o mês de início armazenado
            [anoInicio, mesInicio] = alunoMesInicioPlano[alunoId].split('-').map(Number);
        } else {
            // Se não temos, usar o mês atual como referência para calcular
            // (ou buscar do banco de dados se disponível)
            mesInicio = mesAtual;
            anoInicio = anoAtual;
            // Armazenar para futuros recibos
            alunoMesInicioPlano[alunoId] = mesReferencia;
        }
        
        // Calcular mês final total do plano
        let mesFinal = mesInicio + duracaoTotal - 1;
        let anoFinal = anoInicio;
        
        // Ajustar se passar de dezembro
        while (mesFinal > 12) {
            mesFinal -= 12;
            anoFinal += 1;
        }
        
        // Formatar mês para português
        function formatarMesAno(ano, mes) {
            const meses = [
                'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
            ];
            return `${meses[mes - 1]} de ${ano}`;
        }
        
        // Para o recibo do mês atual, mostrar: "Mês atual até mês final"
        const inicioFormatado = formatarMesAno(anoAtual, mesAtual);
        const finalFormatado = formatarMesAno(anoFinal, mesFinal);
        
        return `${inicioFormatado} até ${finalFormatado}`;
    }
    
    // Função para obter os planos adquiridos formatados
    function formatarPlanosAdquiridosParaRecibo(planos) {
        if (!planos || !Array.isArray(planos) || planos.length === 0) {
            return 'Nenhum plano especificado';
        }
        
        // Simplificar a formatação para o recibo
        return planos.map(plano => {
            if (plano.includes('Alfabetização')) return 'Alfabetização';
            if (plano.includes('Fundamental I')) return 'Fundamental I (1º ao 3º ano)';
            if (plano.includes('4º e 5º ano')) return '4º e 5º ano';
            if (plano.includes('Fundamental II')) return 'Fundamental II (6º e 7º ano)';
            if (plano.includes('8º ano')) return '8º ano';
            if (plano.includes('9º ano')) return '9º ano';
            return plano;
        }).join(' | ');
    }
    
    // Função para formatar mês de referência
    function formatarMes(mesAno) {
        if (!mesAno) return '';
        const [ano, mes] = mesAno.split('-');
        const meses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        return `${meses[parseInt(mes) - 1]} de ${ano}`;
    }
    
    // Função para obter o período mais comum dos horários do aluno
    function obterPeriodoAluno(aluno) {
        if (!aluno.horarios || aluno.horarios.length === 0) {
            return aluno.periodo || '';
        }
        
        const frequenciaPeriodos = {};
        aluno.horarios.forEach(horario => {
            if (horario.periodo) {
                frequenciaPeriodos[horario.periodo] = (frequenciaPeriodos[horario.periodo] || 0) + 1;
            }
        });
        
        let periodoMaisFrequente = '';
        let maiorFrequencia = 0;
        
        for (const [periodo, frequencia] of Object.entries(frequenciaPeriodos)) {
            if (frequencia > maiorFrequencia) {
                maiorFrequencia = frequencia;
                periodoMaisFrequente = periodo;
            }
        }
        
        return periodoMaisFrequente;
    }
    
    // Carregar alunos do Firebase
    function carregarAlunos() {
        if (!elements.alunoSelect) return;
        
        elements.alunoSelect.innerHTML = '<option value="">Carregando alunos...</option>';
        
        db.collection("alunos").orderBy("nome").get()
            .then((querySnapshot) => {
                alunos = [];
                elements.alunoSelect.innerHTML = '<option value="">Selecione um aluno</option>';
                
                querySnapshot.forEach((doc) => {
                    const aluno = doc.data();
                    aluno.id = doc.id;
                    alunos.push(aluno);
                    
                    // Verificar se o aluno tem data de cadastro para determinar início do plano
                    if (aluno.dataCadastro && aluno.dataCadastro.toDate) {
                        const dataCadastro = aluno.dataCadastro.toDate();
                        const mesInicio = dataCadastro.getMonth() + 1; // Janeiro = 0
                        const anoInicio = dataCadastro.getFullYear();
                        alunoMesInicioPlano[aluno.id] = `${anoInicio}-${mesInicio.toString().padStart(2, '0')}`;
                    } else if (aluno.vencimento) {
                        // Usar a data de vencimento como referência para o mês de início
                        const [ano, mes, dia] = aluno.vencimento.split('-');
                        alunoMesInicioPlano[aluno.id] = `${ano}-${mes}`;
                    }
                    
                    const option = document.createElement('option');
                    option.value = aluno.id;
                    
                    // Adicionar informações extras na exibição do aluno
                    let textoExibicao = aluno.nome;
                    if (aluno.tipoPlano) {
                        textoExibicao += ` (${formatarTipoPlanoParaRecibo(aluno.tipoPlano)})`;
                    }
                    if (aluno.valor) {
                        textoExibicao += ` - R$ ${aluno.valor}`;
                    }
                    
                    option.textContent = textoExibicao;
                    elements.alunoSelect.appendChild(option);
                });
            })
            .catch((error) => {
                console.error("Erro ao carregar alunos: ", error);
                elements.alunoSelect.innerHTML = '<option value="">Erro ao carregar alunos</option>';
            });
    }
    
    // Preencher automaticamente os campos quando um aluno é selecionado
    elements.alunoSelect?.addEventListener('change', function() {
        const alunoId = this.value;
        if (!alunoId) return;
        
        const aluno = alunos.find(a => a.id === alunoId);
        if (aluno) {
            const valorInput = document.getElementById('valorPagamento');
            const vencimentoInput = document.getElementById('dataVencimento');
            
            if (valorInput) valorInput.value = aluno.valor || '';
            if (vencimentoInput) vencimentoInput.value = aluno.vencimento || '';
            
            // Marcar os checkboxes dos dias
            document.querySelectorAll('input[name="diasRecibo"]').forEach(checkbox => {
                if (aluno.horarios && aluno.horarios.length > 0) {
                    const todosDias = aluno.horarios.flatMap(h => h.dias || []);
                    checkbox.checked = todosDias.includes(checkbox.value);
                } else if (aluno.dias) {
                    checkbox.checked = aluno.dias && aluno.dias.includes(checkbox.value);
                }
            });
            
            // Se não temos mês de início armazenado e o aluno tem data de vencimento,
            // usar o mês do vencimento como referência
            if (!alunoMesInicioPlano[alunoId] && aluno.vencimento) {
                const [ano, mes, dia] = aluno.vencimento.split('-');
                alunoMesInicioPlano[alunoId] = `${ano}-${mes}`;
            }
        }
    });
    
    // Funções auxiliares para formatação
    function formatarData(dataISO) {
        if (!dataISO) return '';
        const [ano, mes, dia] = dataISO.split('-');
        return `${dia}/${mes}/${ano}`;
    }
    
    // Função para sugerir próximo mês de referência baseado no histórico
    function sugerirProximoMes(alunoId, historicoMeses) {
        if (!alunoId || !historicoMeses || historicoMeses.length === 0) {
            // Se não tem histórico, sugerir mês atual ou próximo
            const hoje = new Date();
            const mesAtual = hoje.getMonth() + 1;
            const anoAtual = hoje.getFullYear();
            return `${anoAtual}-${mesAtual.toString().padStart(2, '0')}`;
        }
        
        // Pegar o último mês do histórico
        const ultimoMes = historicoMeses[historicoMeses.length - 1];
        const [ano, mes] = ultimoMes.split('-').map(Number);
        
        // Calcular próximo mês
        let proximoMes = mes + 1;
        let proximoAno = ano;
        
        if (proximoMes > 12) {
            proximoMes = 1;
            proximoAno += 1;
        }
        
        return `${proximoAno}-${proximoMes.toString().padStart(2, '0')}`;
    }
    
    // Gerar recibo
    elements.gerarReciboBtn.addEventListener('click', function() {
        console.log("Botão Gerar Recibo clicado");
        
        if (!elements.reciboForm.checkValidity()) {
            alert("Por favor, preencha todos os campos obrigatórios!");
            return;
        }
        
        const alunoId = elements.alunoSelect.value;
        const aluno = alunos.find(a => a.id === alunoId);
        
        if (!aluno) {
            alert("Aluno não encontrado!");
            return;
        }
        
        // Obter valores do formulário
        const mesReferencia = document.getElementById('mesReferencia')?.value;
        const dataVencimento = document.getElementById('dataVencimento')?.value;
        const dataPagamento = document.getElementById('dataPagamento')?.value;
        const valorPagamento = document.getElementById('valorPagamento')?.value;
        
        if (!mesReferencia || !dataPagamento || !valorPagamento) {
            alert("Dados incompletos!");
            return;
        }
        
        // Atualizar/confirmar mês de início do plano se necessário
        if (!alunoMesInicioPlano[alunoId]) {
            // Se ainda não temos mês de início, usar o mês de referência atual
            alunoMesInicioPlano[alunoId] = mesReferencia;
        } else {
            // Verificar se o mês de referência é anterior ao mês de início
            // Se for, ajustar o mês de início para o mês de referência
            const [anoRef, mesRef] = mesReferencia.split('-').map(Number);
            const [anoInicio, mesInicio] = alunoMesInicioPlano[alunoId].split('-').map(Number);
            
            // Se o mês de referência for anterior ao mês de início, usar ele como início
            if (anoRef < anoInicio || (anoRef === anoInicio && mesRef < mesInicio)) {
                alunoMesInicioPlano[alunoId] = mesReferencia;
            }
        }
        
        // Obter dias selecionados
        const diasCheckboxes = document.querySelectorAll('input[name="diasRecibo"]:checked');
        const diasRecibo = Array.from(diasCheckboxes).map(cb => cb.value).join(', ');
        
        // Determinar período do aluno
        const periodoAluno = obterPeriodoAluno(aluno);
        
        // Formatar o tipo de plano
        const tipoPlano = aluno.tipoPlano || 'bimestral';
        const tipoPlanoFormatado = formatarTipoPlanoParaRecibo(tipoPlano);
        
        // Calcular período RESTANTE do plano (mês atual até mês final)
        const periodoPlano = calcularPeriodoRestantePlano(alunoId, mesReferencia, tipoPlano);
        
        // Formatar planos adquiridos
        const planosFormatados = formatarPlanosAdquiridosParaRecibo(aluno.planosAdquiridos);
        
        // Preencher o recibo
        if (elements.reciboNomeAluno) elements.reciboNomeAluno.textContent = aluno.nome || '';
        if (elements.reciboValor) elements.reciboValor.textContent = parseFloat(valorPagamento).toFixed(2).replace('.', ',') || '0,00';
        if (elements.reciboMes) elements.reciboMes.textContent = formatarMes(mesReferencia) || '';
        
        if (elements.reciboPlanoContratado) {
            let textoPlano = `${tipoPlanoFormatado}`;
            if (planosFormatados && planosFormatados !== 'Nenhum plano especificado') {
                textoPlano += ` | ${planosFormatados}`;
            }
            elements.reciboPlanoContratado.textContent = textoPlano;
        }
        
        if (elements.reciboPeriodoPlano) {
            elements.reciboPeriodoPlano.textContent = periodoPlano;
        }
        
        if (elements.reciboPeriodo) elements.reciboPeriodo.textContent = periodoAluno || '';
        if (elements.reciboDias) elements.reciboDias.textContent = diasRecibo || '';
        if (elements.reciboVencimento) elements.reciboVencimento.textContent = formatarData(dataVencimento) || '';
        if (elements.reciboPagamento) elements.reciboPagamento.textContent = formatarData(dataPagamento) || '';
        if (elements.reciboDataEmissao) elements.reciboDataEmissao.textContent = formatarData(new Date().toISOString().split('T')[0]) || '';
        if (elements.reciboCnpj) elements.reciboCnpj.textContent = "CNPJ: 19.848.909/0001-22";
        
        // Mostrar o recibo com animação
        if (elements.reciboPreview) {
            elements.reciboPreview.style.display = 'block';
            gsap.fromTo(elements.reciboPreview, 
                { opacity: 0, y: 50 },
                { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }
            );
            
            // Scroll suave até o recibo
            gsap.to(window, {
                duration: 1,
                scrollTo: elements.reciboPreview,
                ease: "power2.inOut"
            });
        }
        
        // Opcional: Armazenar o mês gerado no histórico (pode ser salvo no Firebase)
        console.log(`Recibo gerado para ${aluno.nome} - Mês: ${mesReferencia}`);
    });
    
    // Função para gerar PDF do recibo
    async function gerarPDF() {
        if (!elements.reciboPreview || elements.reciboPreview.style.display === 'none') {
            alert("Por favor, gere o recibo primeiro antes de exportar para PDF.");
            return;
        }

        try {
            const reciboClone = elements.reciboPreview.cloneNode(true);
            reciboClone.style.display = 'block';
            reciboClone.style.width = '210mm';
            reciboClone.style.padding = '20px';
            
            document.body.appendChild(reciboClone);
            
            const canvas = await html2canvas(reciboClone, {
                scale: 2,
                logging: false,
                useCORS: true,
                backgroundColor: null
            });
            
            document.body.removeChild(reciboClone);
            
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 190;
            const pageHeight = 277;
            const imgHeight = canvas.height * imgWidth / canvas.width;
            
            pdf.addImage(canvas, 'PNG', 10, 10, imgWidth, imgHeight);
            
            const nomeArquivo = `recibo_${elements.reciboNomeAluno?.textContent || 'aluno'}_${formatarMes(document.getElementById('mesReferencia')?.value || '').replace(/\s+/g, '_') || 'mes'}.pdf`;
            pdf.save(nomeArquivo);
            
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            alert("Ocorreu um erro ao gerar o PDF. Por favor, tente novamente.");
        }
    }
    
    // Adicionar evento ao botão de download PDF
    if (elements.downloadPdfBtn) {
        elements.downloadPdfBtn.addEventListener('click', gerarPDF);
    } else {
        console.error("Botão de download PDF não encontrado!");
    }
    
    // Limpar formulário
    elements.limparFormBtn.addEventListener('click', function() {
        if (confirm("Deseja realmente limpar o formulário?")) {
            elements.reciboForm.reset();
            
            const dataPagamento = document.getElementById('dataPagamento');
            if (dataPagamento) dataPagamento.value = new Date().toISOString().split('T')[0];
            
            if (elements.reciboPreview) {
                gsap.to(elements.reciboPreview, {
                    opacity: 0,
                    y: 20,
                    duration: 0.5,
                    onComplete: () => {
                        elements.reciboPreview.style.display = 'none';
                    }
                });
            }
        }
    });
    
    // Configurar data de pagamento como hoje por padrão
    const dataPagamento = document.getElementById('dataPagamento');
    if (dataPagamento) {
        dataPagamento.value = new Date().toISOString().split('T')[0];
    }
    
    // Configurar mês de referência como mês atual por padrão
    const mesReferenciaInput = document.getElementById('mesReferencia');
    if (mesReferenciaInput) {
        const hoje = new Date();
        const mesAtual = (hoje.getMonth() + 1).toString().padStart(2, '0');
        const anoAtual = hoje.getFullYear();
        mesReferenciaInput.value = `${anoAtual}-${mesAtual}`;
    }
    
    // Inicializar
    carregarAlunos();
});