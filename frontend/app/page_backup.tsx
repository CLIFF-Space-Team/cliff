'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Shield, Globe, Satellite } from 'lucide-react'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-6">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-10 w-10 text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
              CLIFF
            </h1>
            <p className="text-slate-400">
              Cosmic Level Intelligent Forecast Framework
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="cosmic">System Online</Badge>
          <Badge variant="success">All Systems Nominal</Badge>
        </div>
      </header>

      {/* Main Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Threat Overview Card */}
        <Card variant="cosmic">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-400" />
              Threat Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Active Threats</span>
                <Badge variant="low">0</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Risk Level</span>
                <Badge variant="success">LOW</Badge>
              </div>
              <div className="text-sm text-slate-400">
                All monitoring systems are operational. No immediate threats detected.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Earth Monitoring Card */}
        <Card variant="cosmic">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-green-400" />
              Earth Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Natural Events</span>
                <Badge variant="info">Monitoring</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Weather Status</span>
                <Badge variant="success">Stable</Badge>
              </div>
              <div className="text-sm text-slate-400">
                Global monitoring systems are tracking atmospheric and geological conditions.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Space Objects Card */}
        <Card variant="cosmic">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Satellite className="h-5 w-5 text-blue-400" />
              Space Objects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Near Earth Objects</span>
                <Badge variant="info">Tracking</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Hazardous Objects</span>
                <Badge variant="low">0</Badge>
              </div>
              <div className="text-sm text-slate-400">
                NASA NEO database is being continuously monitored for potential threats.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-wrap gap-4">
        <Button variant="cosmic">
          <Satellite className="h-4 w-4 mr-2" />
          3D Space View
        </Button>
        <Button variant="outline">
          <Globe className="h-4 w-4 mr-2" />
          Earth Events
        </Button>
        <Button variant="outline">
          <Shield className="h-4 w-4 mr-2" />
          Threat Analysis
        </Button>
      </div>

      {/* Status Footer */}
      <footer className="mt-12 p-4 border-t border-slate-800/50">
        <div className="flex justify-between items-center text-sm text-slate-400">
          <span>CLIFF Dashboard v1.0.0</span>
          <span>Connected to NASA APIs</span>
          <span>Last Updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </footer>
    </div>
  )
}