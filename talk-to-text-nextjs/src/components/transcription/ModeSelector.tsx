'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Zap, 
  User, 
  Users, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  Info,
  Star,
  AlertTriangle
} from 'lucide-react';
import { 
  TranscriptionMode, 
  TranscriptionModeConfig, 
  TranscriptionModeSelection,
  TRANSCRIPTION_MODES 
} from '@/types/transcription-modes';

interface ModeSelectorProps {
  onModeSelect: (selection: TranscriptionModeSelection) => void;
  selectedMode?: TranscriptionMode;
  duration?: number; // in minutes
  disabled?: boolean;
}

export default function ModeSelector({ 
  onModeSelect, 
  selectedMode = 'ai', 
  duration = 0,
  disabled = false 
}: ModeSelectorProps) {
  const [mode, setMode] = useState<TranscriptionMode>(selectedMode);
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [qualityLevel, setQualityLevel] = useState<'standard' | 'premium' | 'enterprise'>('standard');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [deadline, setDeadline] = useState<Date | undefined>();

  const getModeIcon = (modeType: TranscriptionMode) => {
    switch (modeType) {
      case 'ai':
        return <Zap className="h-5 w-5" />;
      case 'human':
        return <User className="h-5 w-5" />;
      case 'hybrid':
        return <Users className="h-5 w-5" />;
    }
  };

  const calculateEstimatedCost = (modeConfig: TranscriptionModeConfig) => {
    if (!duration || !modeConfig.pricing) return null;
    const baseCost = duration * modeConfig.pricing.basePrice;
    const priorityMultiplier = priority === 'urgent' ? 2 : priority === 'high' ? 1.5 : 1;
    const qualityMultiplier = qualityLevel === 'enterprise' ? 1.5 : qualityLevel === 'premium' ? 1.25 : 1;
    return (baseCost * priorityMultiplier * qualityMultiplier).toFixed(2);
  };

  const handleConfirm = () => {
    const selection: TranscriptionModeSelection = {
      mode,
      priority,
      qualityLevel,
      specialRequirements: specialRequirements.trim() || undefined,
      deadline
    };
    onModeSelect(selection);
  };

  const getPriorityBadgeVariant = (p: string) => {
    switch (p) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'normal': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Choose Transcription Mode
          </CardTitle>
          <CardDescription>
            Select the transcription method that best fits your needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={mode} onValueChange={(value) => setMode(value as TranscriptionMode)}>
            <div className="grid gap-4">
              {Object.values(TRANSCRIPTION_MODES).map((modeConfig) => (
                <div key={modeConfig.mode} className="flex items-start space-x-3">
                  <RadioGroupItem value={modeConfig.mode} id={modeConfig.mode} className="mt-1" />
                  <Label htmlFor={modeConfig.mode} className="flex-1 cursor-pointer">
                    <Card className={`transition-all ${mode === modeConfig.mode ? 'ring-2 ring-blue-500' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                              {getModeIcon(modeConfig.mode)}
                            </div>
                            <div>
                              <h3 className="font-semibold">{modeConfig.label}</h3>
                              <p className="text-sm text-gray-600">{modeConfig.description}</p>
                            </div>
                          </div>
                          <Badge variant={modeConfig.availability === 'available' ? 'default' : 'secondary'}>
                            {modeConfig.availability}
                          </Badge>
                        </div>
                        
                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span>{modeConfig.estimatedTime}</span>
                          </div>
                          {modeConfig.pricing && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-gray-500" />
                              <span>${modeConfig.pricing.basePrice} {modeConfig.pricing.unit}</span>
                              {duration > 0 && (
                                <span className="text-blue-600 font-medium">
                                  (~${calculateEstimatedCost(modeConfig)})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-3">
                          <div className="flex flex-wrap gap-1">
                            {modeConfig.features.slice(0, 3).map((feature, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {feature}
                              </Badge>
                            ))}
                            {modeConfig.features.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{modeConfig.features.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Advanced Options */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Options</CardTitle>
          <CardDescription>
            Customize priority, quality, and additional requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Priority Selection */}
          <div>
            <Label className="text-sm font-medium">Priority Level</Label>
            <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <Badge variant={getPriorityBadgeVariant('low')}>Low</Badge>
                    <span>Standard processing time</span>
                  </div>
                </SelectItem>
                <SelectItem value="normal">
                  <div className="flex items-center gap-2">
                    <Badge variant={getPriorityBadgeVariant('normal')}>Normal</Badge>
                    <span>Regular priority (recommended)</span>
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <Badge variant={getPriorityBadgeVariant('high')}>High</Badge>
                    <span>Faster processing (+50% cost)</span>
                  </div>
                </SelectItem>
                <SelectItem value="urgent">
                  <div className="flex items-center gap-2">
                    <Badge variant={getPriorityBadgeVariant('urgent')}>Urgent</Badge>
                    <span>Rush processing (+100% cost)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quality Level */}
          <div>
            <Label className="text-sm font-medium">Quality Level</Label>
            <Select value={qualityLevel} onValueChange={(value: any) => setQualityLevel(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    <span>Standard Quality</span>
                  </div>
                </SelectItem>
                <SelectItem value="premium">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-current" />
                    <span>Premium Quality (+25% cost)</span>
                  </div>
                </SelectItem>
                <SelectItem value="enterprise">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-current text-yellow-500" />
                    <span>Enterprise Quality (+50% cost)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Special Requirements */}
          <div>
            <Label className="text-sm font-medium">Special Requirements (Optional)</Label>
            <Textarea
              placeholder="Any special instructions, terminology, or formatting requirements..."
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
              rows={3}
            />
          </div>

          {/* Cost Summary */}
          {duration > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium mb-2">Estimated Cost Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Audio Duration:</span>
                  <span>{Math.ceil(duration)} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span>Base Cost ({TRANSCRIPTION_MODES[mode].pricing?.basePrice}/min):</span>
                  <span>${(duration * (TRANSCRIPTION_MODES[mode].pricing?.basePrice || 0)).toFixed(2)}</span>
                </div>
                {priority !== 'normal' && (
                  <div className="flex justify-between text-orange-600">
                    <span>Priority Adjustment:</span>
                    <span>+{priority === 'urgent' ? '100%' : '50%'}</span>
                  </div>
                )}
                {qualityLevel !== 'standard' && (
                  <div className="flex justify-between text-blue-600">
                    <span>Quality Adjustment:</span>
                    <span>+{qualityLevel === 'enterprise' ? '50%' : '25%'}</span>
                  </div>
                )}
                <hr className="my-2" />
                <div className="flex justify-between font-medium text-lg">
                  <span>Total Estimated Cost:</span>
                  <span>${calculateEstimatedCost(TRANSCRIPTION_MODES[mode])}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation */}
      <div className="flex gap-3">
        <Button 
          onClick={handleConfirm}
          disabled={disabled}
          className="flex-1"
        >
          Confirm Selection
        </Button>
      </div>
    </div>
  );
}