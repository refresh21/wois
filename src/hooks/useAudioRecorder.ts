'use client'

import { useState, useRef, useCallback } from 'react'
import { useToast } from '@/components/ToastContext'

export function useAudioRecorder() {
    const [isRecording, setIsRecording] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
    const [transcript, setTranscript] = useState<string>('')
    const { showToast } = useToast()

    const mediaRecorder = useRef<MediaRecorder | null>(null)
    const audioChunks = useRef<Blob[]>([])
    const timerInterval = useRef<NodeJS.Timeout | null>(null)

    // Basic mock for SpeechRecognition since webkitSpeechRecognition is Chrome only
    const speechRecognition = useRef<any>(null)

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            mediaRecorder.current = new MediaRecorder(stream)

            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data)
                }
            }

            mediaRecorder.current.onstop = () => {
                const blob = new Blob(audioChunks.current, { type: 'audio/webm' })
                setAudioBlob(blob)
                audioChunks.current = [] // reset
            }

            mediaRecorder.current.start()
            setIsRecording(true)
            setIsPaused(false)

            // Start timer
            setRecordingTime(0)
            timerInterval.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1)
            }, 1000)

            // Try starting speech recognition mock or real
            startSpeechRecognition()

        } catch (error) {
            console.error('Error starting recording:', error)
            showToast("Microphone permission denied or not available.", "error")
        }
    }, [showToast])

    const stopRecording = useCallback(() => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop()
            mediaRecorder.current.stream.getTracks().forEach(track => track.stop())
            setIsRecording(false)
            setIsPaused(false)
            if (timerInterval.current) {
                clearInterval(timerInterval.current)
            }
            stopSpeechRecognition()
        }
    }, [isRecording])

    const pauseRecording = useCallback(() => {
        if (mediaRecorder.current && isRecording && !isPaused) {
            mediaRecorder.current.pause()
            setIsPaused(true)
            if (timerInterval.current) {
                clearInterval(timerInterval.current)
            }
        }
    }, [isRecording, isPaused])

    const resumeRecording = useCallback(() => {
        if (mediaRecorder.current && isRecording && isPaused) {
            mediaRecorder.current.resume()
            setIsPaused(false)
            timerInterval.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1)
            }, 1000)
        }
    }, [isRecording, isPaused])

    const startSpeechRecognition = () => {
        // Check if browser supports speech recognition
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition()
            recognition.continuous = true
            recognition.interimResults = true
            recognition.lang = 'en-US'

            recognition.onresult = (event: any) => {
                let currentTranscript = ''
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    currentTranscript += event.results[i][0].transcript
                }
                setTranscript(prev => {
                    // just append or replace
                    return currentTranscript // Simplified for demo
                })
            }

            recognition.start()
            speechRecognition.current = recognition
        } else {
            // Mock transcript over time if API not available
            setTranscript('Recording... (Speech Recognition not supported in this browser, mock transcript active)')
        }
    }

    const stopSpeechRecognition = () => {
        if (speechRecognition.current) {
            speechRecognition.current.stop()
        }
    }

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0')
        const s = (seconds % 60).toString().padStart(2, '0')
        return `${m}:${s}`
    }

    return {
        isRecording,
        isPaused,
        recordingTime: formatTime(recordingTime),
        audioBlob,
        transcript,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
    }
}
