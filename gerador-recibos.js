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
        reciboDataEmissao: getElement('reciboDataEmissao'),
        reciboCnpj: getElement('reciboCnpj'),
        downloadPdfBtn: getElement('downloadPdfBtn') // Novo botão adicionado
    };

    // Verificar elementos essenciais
    if (!elements.reciboForm || !elements.gerarReciboBtn) {
        console.error("Elementos essenciais não encontrados!");
        return;
    }

    // Variáveis
    let alunos = [];
    
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
                    
                    const option = document.createElement('option');
                    option.value = aluno.id;
                    option.textContent = aluno.nome;
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
                checkbox.checked = aluno.dias && aluno.dias.includes(checkbox.value);
            });
        }
    });
    
    // Funções auxiliares para formatação
    function formatarData(dataISO) {
        if (!dataISO) return '';
        const [ano, mes, dia] = dataISO.split('-');
        return `${dia}/${mes}/${ano}`;
    }
    
    function formatarMes(mesAno) {
        if (!mesAno) return '';
        const [ano, mes] = mesAno.split('-');
        const meses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        return `${meses[parseInt(mes) - 1]} de ${ano}`;
    }
    
    // Gerar recibo
    elements.gerarReciboBtn.addEventListener('click', function() {
        console.log("Botão Gerar Recibo clicado");
        
        // Verificar se o formulário é válido
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
        
        // Verificar se todos os campos necessários estão preenchidos
        if (!mesReferencia || !dataPagamento || !valorPagamento) {
            alert("Dados incompletos!");
            return;
        }
        
        // Obter dias selecionados
        const diasCheckboxes = document.querySelectorAll('input[name="diasRecibo"]:checked');
        const diasRecibo = Array.from(diasCheckboxes).map(cb => cb.value).join(', ');
        
        // Preencher o recibo com verificações de segurança
        if (elements.reciboNomeAluno) elements.reciboNomeAluno.textContent = aluno.nome || '';
        if (elements.reciboValor) elements.reciboValor.textContent = parseFloat(valorPagamento).toFixed(2) || '0,00';
        if (elements.reciboMes) elements.reciboMes.textContent = formatarMes(mesReferencia) || '';
        if (elements.reciboPeriodo) elements.reciboPeriodo.textContent = aluno.periodo || '';
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
    });
    
    // Função para gerar PDF do recibo
    async function gerarPDF() {
        if (!elements.reciboPreview || elements.reciboPreview.style.display === 'none') {
            alert("Por favor, gere o recibo primeiro antes de exportar para PDF.");
            return;
        }

        try {
            // Criar um clone do recibo para o PDF
            const reciboClone = elements.reciboPreview.cloneNode(true);
            reciboClone.style.display = 'block';
            reciboClone.style.width = '210mm'; // Largura A4
            reciboClone.style.padding = '20px';
            
            // Adicionar temporariamente ao corpo
            document.body.appendChild(reciboClone);
            
            // Gerar o canvas com html2canvas
            const canvas = await html2canvas(reciboClone, {
                scale: 2,
                logging: false,
                useCORS: true,
                backgroundColor: null
            });
            
            // Remover o clone
            document.body.removeChild(reciboClone);
            
            // Criar PDF
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 190;
            const pageHeight = 277;
            const imgHeight = canvas.height * imgWidth / canvas.width;
            
            pdf.addImage(canvas, 'PNG', 10, 10, imgWidth, imgHeight);
            
            // Salvar o PDF
            const nomeArquivo = `recibo_${elements.reciboNomeAluno?.textContent || 'aluno'}_${elements.reciboMes?.textContent.replace(/\s+/g, '_') || 'mes'}.pdf`;
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
            
            // Resetar a data de pagamento para hoje
            const dataPagamento = document.getElementById('dataPagamento');
            if (dataPagamento) dataPagamento.value = new Date().toISOString().split('T')[0];
            
            // Esconder o recibo com animação
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
    
    // Inicializar
    carregarAlunos();
});