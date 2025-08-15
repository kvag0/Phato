import 'package:flutter/cupertino.dart';
import '../core/theme/app_theme.dart';

/// Um widget reutilizável que representa um campo de texto para chat.
class ChatInputField extends StatefulWidget {
  // O callback que será chamado quando o utilizador enviar uma mensagem.
  final Function(String) onSendMessage;

  const ChatInputField({super.key, required this.onSendMessage});

  @override
  State<ChatInputField> createState() => _ChatInputFieldState();
}

class _ChatInputFieldState extends State<ChatInputField> {
  // Controlador para ler e limpar o campo de texto.
  final TextEditingController _textController = TextEditingController();
  // Variável de estado para controlar se o botão de enviar deve estar ativo.
  bool _canSend = false;

  @override
  void initState() {
    super.initState();
    // Adicionamos um "ouvinte" ao controlador de texto.
    // Sempre que o texto mudar, esta função será chamada.
    _textController.addListener(() {
      // Usamos setState para reconstruir o widget e atualizar o estado do botão.
      setState(() {
        _canSend = _textController.text.trim().isNotEmpty;
      });
    });
  }

  @override
  void dispose() {
    // É uma boa prática "limpar" os controladores quando o widget é destruído.
    _textController.dispose();
    super.dispose();
  }

  // Função para lidar com o envio da mensagem.
  void _handleSend() {
    // Verificação de segurança, embora o botão deva estar desativado.
    if (!_canSend) return;

    // Chama a função de callback passada pelo widget "pai".
    widget.onSendMessage(_textController.text.trim());

    // Limpa o campo de texto após o envio.
    _textController.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
      color: AppTheme.phatoBlack, // Cor de fundo da barra
      child: SafeArea(
        top: false, // Não aplica padding de safe area no topo
        child: Row(
          children: [
            // O campo de texto vai expandir para ocupar o espaço disponível.
            Expanded(
              child: CupertinoTextField(
                controller: _textController,
                placeholder: 'Pergunte algo sobre esta notícia...',
                placeholderStyle: AppTheme.secondaryTextStyle.copyWith(
                  color: AppTheme.phatoTextGray.withOpacity(0.6),
                ),
                style: AppTheme.bodyTextStyle,
                padding: const EdgeInsets.symmetric(
                  horizontal: 16.0,
                  vertical: 12.0,
                ),
                decoration: BoxDecoration(
                  color: AppTheme.phatoCardGray,
                  borderRadius: BorderRadius.circular(20.0),
                ),
                // Ação ao pressionar "Enter" no teclado.
                onSubmitted: (_) => _handleSend(),
              ),
            ),
            const SizedBox(width: 8.0),
            // Botão de Enviar
            CupertinoButton(
              padding: EdgeInsets.zero,
              // O callback onPressed é nulo se _canSend for falso, o que desativa o botão.
              onPressed: _canSend ? _handleSend : null,
              child: Icon(
                CupertinoIcons.arrow_up_circle_fill,
                size: 32,
                // A cor do botão muda com base no estado _canSend.
                color: _canSend
                    ? AppTheme.phatoYellow
                    : AppTheme.secondaryTextStyle.color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
