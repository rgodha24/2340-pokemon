import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from './ui/input'
import { ApiService } from '@/lib/api'

export default function Chatbot() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)

  async function askQuestion() {
    if (!question.trim()) return
    setLoading(true)
    setAnswer('')

    try {
      const data = await ApiService.getInstance().chatbotChat(question)
      if (data.success) {
        setAnswer(data.reply!)
      } else {
        setAnswer('Error: Failed to get a response.')
      }
    } catch (err) {
      console.error(err)
      setAnswer('Error: Failed to contact the server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="fixed bottom-4 right-4 rounded-full px-6 py-3">
          Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="fixed top-1/2 left-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 p-4">
        <DialogHeader>
          <DialogTitle>Chatbot Assistant</DialogTitle>
          <DialogDescription>Ask me about Pokémon!</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type your question..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') askQuestion()
            }}
          />
          <Button onClick={askQuestion}>Ask</Button>
          {answer && (
            <div className="max-h-[300px] overflow-y-auto text-sm p-2 bg-gray-100 rounded">
              {answer}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
