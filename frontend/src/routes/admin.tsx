import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUser } from '@/lib/auth'
import { useNavigate } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import type { DashboardData, Report, Trade, User } from '@/lib/types'

export const Route = createFileRoute('/admin')({
  component: AdminDashboard,
})

function AdminDashboard() {
  const navigate = useNavigate()
  const { data: userData } = useUser()
  const [selectedTab, setSelectedTab] = useState('overview')
  const [reportPage, setReportPage] = useState(1)
  const [reportFilter, setReportFilter] = useState('')
  const queryClient = useQueryClient()

  // Redirect non-admin users
  if (!userData?.user?.is_staff) {
    navigate({ to: '/' })
    return null
  }

  const { data: dashboardData } = useQuery<DashboardData>({
    queryKey: ['adminDashboard'],
    queryFn: () => fetch('/api/admin/dashboard/').then(res => res.json())
  })

  const { data: reports } = useQuery<{ reports: Report[], total_pages: number, current_page: number }>({
    queryKey: ['adminReports', reportPage, reportFilter],
    queryFn: () => fetch(`/api/admin/reports/?page=${reportPage}&status=${reportFilter}`).then(res => res.json())
  })

  const { data: activity } = useQuery<{ trades: Trade[] }>({
    queryKey: ['adminActivity'],
    queryFn: () => fetch('/api/admin/activity/?days=7').then(res => res.json())
  })

  const manageTrade = useMutation({
    mutationFn: ({ type, id, action, reason }: { type: string, id: number, action: string, reason?: string }) =>
      fetch(`/api/admin/trade/${type}/${id}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason })
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      queryClient.invalidateQueries({ queryKey: ['adminActivity'] })
    }
  })

  const manageReport = useMutation({
    mutationFn: ({ id, status, notes }: { id: number, status: Report['status'], notes?: string }) =>
      fetch(`/api/admin/report/${id}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_notes: notes })
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReports'] })
    }
  })

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Badge variant={dashboardData?.pending_reports ? "destructive" : "secondary"}>
          {dashboardData?.pending_reports || 0} Pending Reports
        </Badge>
      </div>
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Trades</CardTitle>
                <CardDescription>Currently active listings</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{dashboardData?.active_trades || 0}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Flagged Trades</CardTitle>
                <CardDescription>Trades marked as inappropriate</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-500">{dashboardData?.flagged_trades || 0}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Pending Reports</CardTitle>
                <CardDescription>Reports awaiting review</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-yellow-500">{dashboardData?.pending_reports || 0}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest trades in the marketplace</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pokemon</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData?.recent_trades?.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell className="font-medium">{trade.pokemon__name}</TableCell>
                      <TableCell>{trade.buyer__username}</TableCell>
                      <TableCell>{trade.seller__username}</TableCell>
                      <TableCell>${trade.amount}</TableCell>
                      <TableCell>{format(new Date(trade.timestamp), 'MMM d, yyyy')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <Button
                variant={reportFilter === '' ? "default" : "outline"}
                onClick={() => setReportFilter('')}
              >
                All
              </Button>
              <Button
                variant={reportFilter === 'pending' ? "default" : "outline"}
                onClick={() => setReportFilter('pending')}
              >
                Pending
              </Button>
              <Button
                variant={reportFilter === 'investigating' ? "default" : "outline"}
                onClick={() => setReportFilter('investigating')}
              >
                Investigating
              </Button>
            </div>
            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                onClick={() => setReportPage(p => Math.max(1, p - 1))}
                disabled={reportPage === 1}
              >
                Previous
              </Button>
              <span>Page {reportPage}</span>
              <Button
                variant="outline"
                onClick={() => setReportPage(p => p + 1)}
                disabled={!reports?.reports?.length || reports?.reports?.length < 20}
              >
                Next
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {reports?.reports?.map((report) => (
              <Card key={report.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold">Report #{report.id}</h3>
                        <Badge>{report.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Reported by {report.reporter} on {format(new Date(report.created_at), 'MMM d, yyyy')}
                      </p>
                      <p className="mb-4">{report.reason}</p>
                      {report.admin_notes && (
                        <div className="bg-muted p-3 rounded-md">
                          <p className="text-sm font-medium">Admin Notes:</p>
                          <p className="text-sm">{report.admin_notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        onClick={() => manageReport.mutate({
                          id: report.id,
                          status: 'investigating'
                        })}
                        disabled={report.status === 'investigating'}
                      >
                        Investigate
                      </Button>
                      <Button
                        variant="default"
                        onClick={() => manageReport.mutate({
                          id: report.id,
                          status: 'resolved'
                        })}
                        disabled={report.status === 'resolved'}
                      >
                        Resolve
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => manageReport.mutate({
                          id: report.id,
                          status: 'dismissed'
                        })}
                        disabled={report.status === 'dismissed'}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Trade Activity</CardTitle>
              <CardDescription>Last 7 days of trading activity</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pokemon</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activity?.trades?.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell className="font-medium">{trade.pokemon__name}</TableCell>
                      <TableCell>{trade.buyer__username}</TableCell>
                      <TableCell>{trade.seller__username}</TableCell>
                      <TableCell>${trade.amount}</TableCell>
                      <TableCell>
                        <Badge variant={trade.is_flagged ? "destructive" : "secondary"}>
                          {trade.is_flagged ? 'Flagged' : 'Normal'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={trade.is_flagged ? "outline" : "destructive"}
                          onClick={() => manageTrade.mutate({
                            type: 'money',
                            id: trade.id,
                            action: trade.is_flagged ? 'unflag' : 'flag'
                          })}
                          size="sm"
                        >
                          {trade.is_flagged ? 'Unflag' : 'Flag'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 