import { useRef, useState, useEffect } from 'react';
import {
  Container, Typography, Paper, TextField, Button, Box,
  CircularProgress, Chip, Card, CardContent, IconButton,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/Stop';
import { useChatStore } from '../stores/chatStore';
import type { AgentResponse, FollowUpOption } from '../types';

const SUGGESTIONS = [
  '分析利物浦本赛季的进攻效率',
  '对比 Salah 和 Haaland 的数据',
  '英超积分榜现在怎么样？',
  '谁是本赛季最佳射手？',
  '分析曼城的防守问题',
];

export default function ChatPage() {
  const {
    messages, streaming, streamContent, streamAgentResponse,
    toolStatus, error, sendMessage, clearChat, abortStream,
  } = useChatStore();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamContent]);

  const handleSend = () => {
    if (!input.trim() || streaming) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleFollowUp = (option: FollowUpOption) => {
    sendMessage(option.prompt);
  };

  return (
    <Container maxWidth="md" className="py-6 h-[calc(100vh-100px)] flex flex-col">
      <Box className="flex items-center justify-between mb-4">
        <Typography variant="h4" className="font-bold">🤖 AI 足球分析师</Typography>
        <Button size="small" color="inherit" onClick={clearChat}>清空对话</Button>
      </Box>

      {/* 消息列表 */}
      <Paper className="flex-1 p-4 overflow-auto mb-3" variant="outlined">
        {messages.length === 0 && !streaming && (
          <Typography color="text.secondary" className="text-center mt-8">
            👋 你好！我是 AI 足球数据分析师，可以帮你分析英超联赛数据。试试下面的问题吧！
          </Typography>
        )}

        {messages.map((msg) => (
          <Box key={msg.id} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            {msg.role === 'user' ? (
              <Chip label={msg.content} color="primary" sx={{ maxWidth: '80%', height: 'auto', py: 0.5, px: 1, '& .MuiChip-label': { whiteSpace: 'normal' } }} />
            ) : (
              <Card variant="outlined" sx={{ maxWidth: '95%', display: 'inline-block' }}>
                <CardContent>
                  {msg.agentResponse ? (
                    <AgentResponseCard response={msg.agentResponse} onFollowUp={handleFollowUp} />
                  ) : (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                  )}
                </CardContent>
              </Card>
            )}
          </Box>
        ))}

        {/* 流式输出 */}
        {streaming && (
          <Box className="mb-4 text-left">
            <Card variant="outlined" sx={{ maxWidth: '95%', display: 'inline-block' }}>
              <CardContent>
                {toolStatus && (
                  <Chip label={toolStatus} size="small" color="info" variant="outlined" className="mb-2" />
                )}
                {streamAgentResponse ? (
                  <AgentResponseCard response={streamAgentResponse} streaming onFollowUp={() => {}} />
                ) : (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {streamContent || '...'}
                  </Typography>
                )}
                {!streamAgentResponse && <CircularProgress size={16} className="ml-2" />}
              </CardContent>
            </Card>
          </Box>
        )}
        <div ref={bottomRef} />
      </Paper>

      {error && (
        <Typography color="error" variant="caption" className="mb-2">{error}</Typography>
      )}

      {/* 快捷按钮 */}
      <Box className="flex gap-2 flex-wrap mb-3">
        {SUGGESTIONS.map((s) => (
          <Chip key={s} label={s} size="small" variant="outlined" onClick={() => sendMessage(s)} disabled={streaming} />
        ))}
      </Box>

      {/* 输入框 */}
      <Box className="flex gap-2">
        <TextField
          fullWidth
          placeholder="输入你的足球分析问题..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          disabled={streaming}
          size="small"
        />
        {streaming ? (
          <IconButton color="error" onClick={abortStream}><StopIcon /></IconButton>
        ) : (
          <IconButton color="primary" onClick={handleSend} disabled={!input.trim()}><SendIcon /></IconButton>
        )}
      </Box>
    </Container>
  );
}

/** Agent 结构化响应卡片 */
function AgentResponseCard({
  response,
  streaming = false,
  onFollowUp,
}: {
  response: AgentResponse;
  streaming?: boolean;
  onFollowUp: (option: FollowUpOption) => void;
}) {
  return (
    <Box className={streaming ? 'opacity-80' : ''}>
      <Typography variant="subtitle1" className="font-bold mb-2">{response.summary}</Typography>

      {response.data_overview?.kpis?.length > 0 && (
        <Box className="flex gap-2 flex-wrap mb-3">
          {response.data_overview.kpis.map((kpi, i) => (
            <Chip
              key={i}
              label={`${kpi.label}: ${kpi.value}`}
              size="small"
              color={kpi.trend === 'up' ? 'success' : kpi.trend === 'down' ? 'error' : 'default'}
            />
          ))}
        </Box>
      )}

      {response.deep_analysis && (
        <Typography variant="body2" className="mb-3" sx={{ whiteSpace: 'pre-wrap' }}>
          🎯 {response.deep_analysis}
        </Typography>
      )}

      {response.recommendation && (
        <Box className="mb-3 p-2 bg-green-50 rounded">
          <Typography variant="subtitle2" className="font-bold">✅ {response.recommendation.title}</Typography>
          <Typography variant="body2" color="text.secondary">{response.recommendation.reasoning}</Typography>
          {response.recommendation.action_items?.map((item, i) => (
            <Typography key={i} variant="body2">• {item}</Typography>
          ))}
        </Box>
      )}

      {response.alternatives?.length > 0 && (
        <Box className="mb-3">
          <Typography variant="caption" className="font-bold">🔄 备选方案:</Typography>
          {response.alternatives.map((alt, i) => (
            <Typography key={i} variant="caption" className="block ml-2">• {alt}</Typography>
          ))}
        </Box>
      )}

      {response.follow_up_options?.length > 0 && !streaming && (
        <Box className="flex gap-2 flex-wrap mt-3">
          {response.follow_up_options.map((opt, i) => (
            <Chip
              key={i}
              label={opt.label}
              size="small"
              color="primary"
              variant="outlined"
              clickable
              onClick={() => onFollowUp(opt)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
