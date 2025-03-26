import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Chart, ChartConfiguration, ChartOptions, ChartData } from 'chart.js';
import { registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent implements OnInit, AfterViewInit {
  @ViewChild('activityChart') chartRef!: ElementRef;
  chart!: Chart;

  // Data properties
  activityData: any[] = [];
  selectedUsers: string[] = [];
  availableUsers: any[] = [];
  filteredUsers: any[] = []; // For search functionality
  userSearchText: string = '';
  timeRange: string = 'month'; // default range
  activityType: string = 'message'; // default type
  loading: boolean = false;
  errorMessage: string = '';

  selectedStat: string | null = null;
  savedUserSelection: string[] = [];

  // Current year and month for the selector
  currentYear: number = new Date().getFullYear();
  currentMonth: number = new Date().getMonth() + 1;
  years: number[] = [];
  months: string[] = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  periodStats: {
    messageCount: number;
    voiceTime: number;
    eventsCount: number;
    submissions: number;
  } | null = null;

  // Time range options
  timeRanges = [
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
    { value: 'alltime', label: 'All Time' },
    { value: 'custom', label: 'Custom Range' }
  ];

  // Activity type options
  activityTypes = [
    { value: 'message', label: 'Message Activity' },
    { value: 'voice', label: 'Voice Activity' }
  ];

  // Custom date range
  customStartDate: string;
  customEndDate: string;
  showCustomRange: boolean = false;

  stats: { MessageCount: number; VoiceTime: number; EventsCount: number; Submissions: number } | null = null;

  constructor(private http: HttpClient) {
    Chart.register(...registerables);
    // Initialize years for the selector (past 3 years)
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 3; i++) {
      this.years.push(currentYear - i);
    }

    // Initialize custom date range
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    this.customStartDate = this.formatDate(lastMonth);
    this.customEndDate = this.formatDate(today);
  }

  ngOnInit(): void {
    this.fetchStats();
    this.fetchAvailableUsers();

    this.savedUserSelection = [];
  }

  ngAfterViewInit(): void {
    if (this.chartRef && this.chartRef.nativeElement) {
      this.initChart();
      // Initial update with empty data to show axes
      this.updateChart();
    }
  }


  onStatItemClick(statType: string): void {
    // If already selected, deselect it
    if (this.selectedStat === statType) {
      this.selectedStat = null;

      // If deselecting events or submissions, reset activity type to message
      // since these don't have user-specific versions
      if (statType === 'events' || statType === 'forms') {
        this.activityType = 'message';

        // Update the UI - find the correct button and activate it
        setTimeout(() => {
          // This timeout ensures the DOM has updated after the model change
          const messageButtons = document.querySelectorAll('.control-buttons button');
          messageButtons.forEach(button => {
            if ((button as HTMLElement).innerText.trim().toLowerCase().includes('message')) {
              (button as HTMLElement).classList.add('active');
            } else {
              (button as HTMLElement).classList.remove('active');
            }
          });
        });
      }

      this.selectedUsers = [...this.savedUserSelection]; // Restore previous user selection

      // Reset to standard display
      this.periodStats = null;

      // Update chart with user-specific data
      this.fetchActivityData();
      return;
    }

    // Save current user selection if we're switching from user mode to stat mode
    if (this.selectedStat === null) {
      this.savedUserSelection = [...this.selectedUsers];
    }

    // Set the new selected stat
    this.selectedStat = statType;

    // Clear user selection when viewing server-wide stats
    this.selectedUsers = [];

    // Map the stat type to the activity type for the chart
    switch (statType) {
      case 'message':
        this.activityType = 'message';
        break;
      case 'voice':
        this.activityType = 'voice';
        break;
      case 'events':
        this.activityType = 'events';
        break;
      case 'forms':
        this.activityType = 'forms';
        break;
    }

    // Fetch server-wide stats for this metric
    this.fetchServerStats(statType);
  }


  fetchActivityData(): void {
    if (this.selectedUsers.length === 0) {
      this.activityData = [];
      this.updateChart();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    let endpoint = `/api/menu/activity/${this.activityType}`;
    let params: any = { users: this.selectedUsers.join(',') };

    if (this.timeRange === 'custom') {
      params.startDate = this.customStartDate;
      params.endDate = this.customEndDate;
    } else {
      params.timeRange = this.timeRange;
    }

    this.http.get<any[]>(endpoint, { params, withCredentials: true }).subscribe({
      next: (data) => {
        this.activityData = data;
        this.updateChart();
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = `Failed to fetch ${this.activityType} activity data. Please try again later.`;
        console.error(err);
        this.loading = false;
      }
    });
  }

  initChart(): void {
    const ctx = this.chartRef.nativeElement.getContext('2d');

    const chartOptions: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day',
            tooltipFormat: 'PP',
            displayFormats: {
              day: 'MMM d'
            }
          },
          grid: {
            color: 'rgba(82, 15, 115, 0.2)'
          },
          ticks: {
            color: 'white',
            align: 'center'
          },
          offset: false
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(82, 15, 115, 0.2)'
          },
          ticks: {
            color: 'white'
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: 'white',
            font: {
              family: "'Poppins', sans-serif",
              size: 12
            },
            usePointStyle: true,
            padding: 20
          }
        },
        tooltip: {
          backgroundColor: 'rgba(21, 1, 51, 0.9)',
          borderColor: 'rgba(82, 15, 115, 1)',
          borderWidth: 1,
          titleColor: 'rgba(255, 255, 255, 0.9)',
          bodyColor: 'rgba(255, 255, 255, 0.9)',
          bodyFont: {
            family: "'Poppins', sans-serif"
          },
          titleFont: {
            family: "'Poppins', sans-serif",
            weight: 'bold'
          },
          padding: 12,
          boxPadding: 6,
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${value} ${this.activityType === 'message' ? 'messages' : 'minutes'}`;
            }
          }
        }
      }
    };

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: []
      },
      options: chartOptions
    });
  }

  updateChart(): void {
    if (!this.chart) return;

    // If no data, display empty chart with axes
    if (!this.activityData || this.activityData.length === 0) {
      this.chart.data.datasets = [];
      this.chart.update();
      return;
    }

    // Process the data into a format Chart.js can use
    const datasets: any[] = [];

    // Check if we're in server-wide stat mode
    if (this.selectedStat !== null) {
      // Define a typed object for stat colors
      const statColors: Record<string, string> = {
        'message': '#7b2cbf', // Purple
        'voice': '#42b0f5',   // Blue
        'events': '#EA0071',  // Pink
        'forms': '#10cacd'    // Cyan
      };

      // Now TypeScript knows this is safe
      const color = statColors[this.selectedStat] || '#7b2cbf';

      // Map the property name based on the selected stat type
      let valueProperty: string;
      switch (this.selectedStat) {
        case 'message':
          valueProperty = 'messageCount';
          break;
        case 'voice':
          valueProperty = 'voiceHours';
          break;
        case 'events':
          valueProperty = 'events';
          break;
        case 'forms':
          valueProperty = 'submissions';
          break;
        default:
          valueProperty = 'value';
      }

      // Format the data with the correct property names
      const formattedData = this.activityData.map(item => {
        // Ensure date is a proper Date object at midnight
        const date = new Date(item.date);
        date.setHours(0, 0, 0, 0);

        // Get the value from the appropriate property based on stat type
        let value: number;
        if (item[valueProperty] !== undefined) {
          // Use the mapped property if it exists
          value = item[valueProperty];
        } else if (this.selectedStat === 'message' && item.messageCount !== undefined) {
          value = item.messageCount;
        } else if (this.selectedStat === 'voice' && item.voiceHours !== undefined) {
          value = item.voiceHours;
        } else if (this.selectedStat === 'events' && item.events !== undefined) {
          value = item.events;
        } else if (this.selectedStat === 'forms' && item.submissions !== undefined) {
          value = item.submissions;
        } else {
          // As a fallback, try to find any numeric property that might be the value
          const numericProps = Object.keys(item).filter(key =>
            typeof item[key] === 'number' && key !== 'id' && !key.toLowerCase().includes('date')
          );

          if (numericProps.length > 0) {
            // Use the first numeric property found
            value = item[numericProps[0]];
          } else {
            // If all else fails, use 0 as a fallback
            value = 0;
            console.warn('Could not find value property in data item:', item);
          }
        }

        return {
          x: date,
          y: value
        };
      });

      // Sort data by date
      formattedData.sort((a, b) => a.x.getTime() - b.x.getTime());

      // Get appropriate label based on stat type
      let label: string;
      let tooltipSuffix: string;

      switch (this.selectedStat) {
        case 'message':
          label = 'Server Messages';
          tooltipSuffix = 'messages';
          break;
        case 'voice':
          label = 'Server Voice Activity';
          tooltipSuffix = 'hours';
          break;
        case 'events':
          label = 'Server Evet Signups';
          tooltipSuffix = 'signups';
          break;
        case 'forms':
          label = 'Form Submissions';
          tooltipSuffix = 'submissions';
          break;
        default:
          label = 'Server Activity';
          tooltipSuffix = 'items';
      }

      // Create dataset for server-wide stats
      const dataset = {
        label: label,
        data: formattedData,
        backgroundColor: color + '40', // 40 is alpha for 0.25 opacity
        borderColor: color,
        borderWidth: 3,
        tension: 0.3,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: color,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true
      };

      datasets.push(dataset);

      // Update tooltip callback for server-wide stats
      const tooltipCallbacks = this.chart.options.plugins?.tooltip?.callbacks as any;
      if (tooltipCallbacks) {
        // Define context with proper type
        tooltipCallbacks.label = (context: { parsed: { y: number }, dataset: { label: string } }) => {
          const value = context.parsed.y;
          return `${value} ${tooltipSuffix}`;
        };
      }
    } else {
      // Original code for user-specific datasets
      const userColors = this.generateColorPalette(this.selectedUsers.length);

      this.selectedUsers.forEach((userId, index) => {
        // Get user data from available users
        const user = this.availableUsers.find(u => u.id === userId);
        if (!user) return;

        // Filter activity data for this user
        const userData = this.activityData.filter(item => item.userId === userId);

        // Make sure dates are properly formatted
        const formattedData = userData.map(item => {
          // Ensure date is a proper Date object at midnight
          const date = new Date(item.date);
          date.setHours(0, 0, 0, 0);

          return {
            x: date,
            y: this.activityType === 'message' ? item.messageCount : item.voiceHours
          };
        });

        // Sort data by date for proper line connections
        formattedData.sort((a, b) => a.x.getTime() - b.x.getTime());

        // Create dataset for this user
        const dataset = {
          label: user.username,
          data: formattedData,
          backgroundColor: userColors[index] + '40', // 40 is alpha for 0.25 opacity
          borderColor: userColors[index],
          borderWidth: 2,
          tension: 0.3,
          pointBackgroundColor: userColors[index],
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: userColors[index],
          pointRadius: 4,
          pointHoverRadius: 6
        };

        datasets.push(dataset);
      });

      // Reset tooltip callback for user-specific stats
      const tooltipCallbacks = this.chart.options.plugins?.tooltip?.callbacks as any;
      if (tooltipCallbacks) {
        // Define context with proper type
        tooltipCallbacks.label = (context: { parsed: { y: number }, dataset: { label: string } }) => {
          const label = context.dataset.label || '';
          const value = context.parsed.y;
          return `${label}: ${value} ${this.activityType === 'message' ? 'messages' : 'hours'}`;
        };
      }
    }

    // Update the chart with new data
    this.chart.data.datasets = datasets;

    // Update time unit based on selected range
    const scales = this.chart.options.scales as any;
    if (scales && scales.x) {
      scales.x.time = this.getTimeConfig(this.timeRange);
    }

    this.chart.update();
  }

  // New methods for user selection
  toggleUserSelection(userId: string): void {
    // Don't allow selection changes when in global stats mode
    if (this.selectedStat !== null) {
      return;
    }

    // Don't allow deselecting if only one user is selected
    if (this.selectedUsers.includes(userId)) {
      if (this.selectedUsers.length > 1) {
        this.selectedUsers = this.selectedUsers.filter(id => id !== userId);
        this.fetchActivityData();
      }
    } else {
      // Don't allow selecting more than 10 users
      if (this.selectedUsers.length < 10) {
        this.selectedUsers.push(userId);
        this.fetchActivityData();
      }
    }
  }

  isUserSelected(userId: string): boolean {
    return this.selectedUsers.includes(userId);
  }

  filterUsers(): void {
    // Don't filter if in global stats mode
    if (this.selectedStat !== null) {
      return;
    }

    if (!this.userSearchText.trim()) {
      this.filteredUsers = [...this.availableUsers];
      return;
    }

    const searchTerm = this.userSearchText.trim().toLowerCase();
    this.filteredUsers = this.availableUsers.filter(user =>
      user.username.toLowerCase().includes(searchTerm)
    );
  }

  getUserColor(userId: string): string {
    const index = this.selectedUsers.indexOf(userId);
    if (index >= 0) {
      const colors = this.generateColorPalette(this.selectedUsers.length);
      return colors[index];
    }
    return 'rgba(82, 15, 115, 0.7)';
  }

  getTimeConfig(range: string): any {
    switch (range) {
      case 'week':
        return {
          unit: 'day',
          tooltipFormat: 'PP',
          displayFormats: {
            day: 'MMM d'
          }
        };
      case 'month':
        return {
          unit: 'day',
          tooltipFormat: 'PP',
          displayFormats: {
            day: 'MMM d'
          }
        };
      case 'alltime':  // New case for "All Time"
        return {
          unit: 'month',
          tooltipFormat: 'MMM yyyy',
          displayFormats: {
            month: 'MMM yyyy'
          }
        };
      case 'year':
        return {
          unit: 'month',
          tooltipFormat: 'MMM yyyy',
          displayFormats: {
            month: 'MMM'
          }
        };
      case 'custom':
        // Determine appropriate unit based on range length
        const start = new Date(this.customStartDate);
        const end = new Date(this.customEndDate);
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 14) {
          return {
            unit: 'day',
            tooltipFormat: 'PP',
            displayFormats: { day: 'MMM d' }
          };
        } else if (diffDays <= 90) {
          return {
            unit: 'week',
            tooltipFormat: 'PP',
            displayFormats: { week: 'MMM d' }
          };
        } else {
          return {
            unit: 'month',
            tooltipFormat: 'MMM yyyy',
            displayFormats: { month: 'MMM' }
          };
        }
      default:
        return {
          unit: 'day',
          tooltipFormat: 'PP',
          displayFormats: { day: 'MMM d' }
        };
    }
  }

  onTimeRangeChange(range: string): void {
    this.timeRange = range;
    this.showCustomRange = range === 'custom';

    if (range !== 'custom') {
      if (this.selectedStat) {
        // If a stat is selected, refresh server stats
        this.fetchServerStats(this.selectedStat);
      } else {
        // Otherwise update user data
        this.fetchActivityData();
      }
    }
  }

  onActivityTypeChange(type: string): void {
    if (this.selectedStat !== null) {
      return;
    }

    this.activityType = type;
    this.fetchActivityData();
  }

  onUserSelectionChange(): void {
    this.fetchActivityData();
  }

  applyCustomRange(): void {
    if (this.customStartDate && this.customEndDate) {
      if (this.selectedStat) {
        this.fetchServerStats(this.selectedStat);
      } else {
        this.fetchActivityData();
      }
    }
  }

  generateColorPalette(count: number): string[] {
    // Base colors from your theme
    const baseColors = [
      '#7b2cbf', // Purple (primary)
      '#9d4edd', // Light purple
      '#c77dff', // Lavender
      '#eb2f8a', // Pink
      '#EA0071', // Pink (secondary)
      '#10cacd', // Light pink
      '#42b0f5', // Blue (secondary)
      '#4cc9f0', // Light blue
      '#b5179e', // Magenta
      '#480ca8', // Deep purple
      '#3f37c9', // Indigo
      '#4361ee', // Royal blue
      '#4cc9f0', // Cyan
    ];

    // If we need more colors than we have in the base set, we'll generate them
    if (count <= baseColors.length) {
      return baseColors.slice(0, count);
    }

    // For additional colors, we'll generate them by interpolating
    const result = [...baseColors];
    for (let i = baseColors.length; i < count; i++) {
      // Generate a color based on position in hue color wheel
      const hue = (i * 137.5) % 360; // Use golden angle approximation for better distribution
      result.push(`hsl(${hue}, 80%, 65%)`);
    }

    return result;
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  fetchAvailableUsers(): void {
    this.http.get<any[]>('/api/menu/userdata/users', { withCredentials: true }).subscribe({
      next: (users) => {
        this.availableUsers = users.map(user => ({
          id: user.id,
          username: user.displayname,
          avatar: user.avatar
        }));

        // Initialize filtered users
        this.filteredUsers = [...this.availableUsers];

        // Select top 10 users by default if available
        if (this.availableUsers.length > 0) {
          this.selectedUsers = this.availableUsers.slice(0, Math.min(10, this.availableUsers.length)).map(user => user.id);
          this.fetchActivityData();
        }
      },
      error: (err) => {
        this.errorMessage = 'Failed to fetch users. Please try again later.';
        console.error(err);
      }
    });
  }


  fetchServerStats(statType: string): void {
    this.loading = true;
    this.errorMessage = '';

    let endpoint = `/api/menu/server-stats/${statType}`;
    let params: any = {};

    if (this.timeRange === 'custom') {
      params.startDate = this.customStartDate;
      params.endDate = this.customEndDate;
    } else {
      params.timeRange = this.timeRange;
    }

    this.http.get<any>(endpoint, { params, withCredentials: true }).subscribe({
      next: (data) => {
        // Update the chart with server-wide data
        this.activityData = data.timelineData || [];
        this.updateChart();

        // Update the period stats (for the current time period)
        this.periodStats = {
          messageCount: data.periodStats?.messageCount || 0,
          voiceTime: data.periodStats?.voiceTime || 0,
          eventsCount: data.periodStats?.eventsCount || 0,
          submissions: data.periodStats?.submissions || 0
        };

        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = `Failed to fetch server-wide ${statType} stats. Please try again later.`;
        console.error(err);
        this.loading = false;

        // Reset selection on error
        this.selectedStat = null;
        this.periodStats = null;
      }
    });
  }


  fetchStats(): void {
    this.http.get('/api/menu/get-items').subscribe({
      next: (data: any) => {
        this.stats = {
          MessageCount: data.messageCount || 0,
          VoiceTime: data.voiceTime || 0,
          EventsCount: data.eventsCount || 0,
          Submissions: data.submissions || 0,
        };
      },
      error: (error) => {
        this.errorMessage = 'Error fetching stats. Please try again later.';
        console.error('Error:', error);
      },
    });
  }
}
