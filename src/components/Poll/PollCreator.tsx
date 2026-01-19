import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";

interface PollCreatorProps {
  onPollChange: (poll: { question: string; options: string[] } | null) => void;
}

export function PollCreator({ onPollChange }: PollCreatorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const handleToggle = () => {
    if (isCreating) {
      setIsCreating(false);
      setQuestion("");
      setOptions(["", ""]);
      onPollChange(null);
    } else {
      setIsCreating(true);
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
    
    if (question && newOptions.filter(o => o.trim()).length >= 2) {
      onPollChange({ question, options: newOptions.filter(o => o.trim()) });
    }
  };

  const addOption = () => {
    if (options.length < 4) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
      if (question && newOptions.filter(o => o.trim()).length >= 2) {
        onPollChange({ question, options: newOptions.filter(o => o.trim()) });
      }
    }
  };

  const handleQuestionChange = (value: string) => {
    setQuestion(value);
    if (value && options.filter(o => o.trim()).length >= 2) {
      onPollChange({ question: value, options: options.filter(o => o.trim()) });
    }
  };

  if (!isCreating) {
    return (
      <Button variant="outline" size="sm" onClick={handleToggle}>
        Add Poll
      </Button>
    );
  }

  return (
    <div className="border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Label className="font-semibold">Create Poll</Label>
        <Button variant="ghost" size="icon" onClick={handleToggle}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div>
        <Label htmlFor="poll-question">Question</Label>
        <Input
          id="poll-question"
          value={question}
          onChange={(e) => handleQuestionChange(e.target.value)}
          placeholder="Ask a question..."
          className="mt-1"
        />
      </div>

      <div className="space-y-2">
        <Label>Options</Label>
        {options.map((option, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
            />
            {options.length > 2 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeOption(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {options.length < 4 && (
        <Button variant="outline" size="sm" onClick={addOption}>
          <Plus className="h-4 w-4 mr-1" />
          Add Option
        </Button>
      )}
    </div>
  );
}