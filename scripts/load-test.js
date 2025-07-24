#!/usr/bin/env node

/**
 * Load Testing Script for March Madness Squares Production Environment
 * Tests concurrent user scenarios and performance under load
 */

const { performance } = require('perf_hooks');
const https = require('https');
const WebSocket = require('ws');

class LoadTester {
  constructor(config) {
    this.config = {
      baseUrl: config.baseUrl || 'https://main.d1234567890.amplifyapp.com',
      graphqlEndpoint: config.graphqlEndpoint || 'https://abcdef123456.appsync-api.us-east-1.amazonaws.com/graphql',
      concurrentUsers: config.concurrentUsers || 100,
      testDuration: config.testDuration || 300000, // 5 minutes
      rampUpTime: config.rampUpTime || 60000, // 1 minute
      ...config,
    };
    
    this.metrics = {
      requests: 0,
      responses: 0,
      errors: 0,
      responseTimes: [],
      concurrentConnections: 0,
      maxConcurrentConnections: 0,
    };
    
    this.users = [];
    this.isRunning = false;
  }

  async runLoadTest() {
    console.log('🚀 Starting load test...');
    console.log(`Target: ${this.config.baseUrl}`);
    console.log(`Concurrent users: ${this.config.concurrentUsers}`);
    console.log(`Test duration: ${this.config.testDuration / 1000}s`);
    console.log(`Ramp-up time: ${this.config.rampUpTime / 1000}s`);
    
    this.isRunning = true;
    
    // Start metrics collection
    this.startMetricsCollection();
    
    // Ramp up users gradually
    await this.rampUpUsers();
    
    // Run test for specified duration
    await this.sleep(this.config.testDuration - this.config.rampUpTime);
    
    // Stop test
    this.isRunning = false;
    await this.stopAllUsers();
    
    // Generate report
    this.generateReport();
  }

  async rampUpUsers() {
    const userInterval = this.config.rampUpTime / this.config.concurrentUsers;
    
    for (let i = 0; i < this.config.concurrentUsers; i++) {
      if (!this.isRunning) break;
      
      const user = new VirtualUser(i, this.config, this.metrics);
      this.users.push(user);
      user.start();
      
      await this.sleep(userInterval);
    }
  }

  async stopAllUsers() {
    console.log('🛑 Stopping all virtual users...');
    await Promise.all(this.users.map(user => user.stop()));
  }

  startMetricsCollection() {
    this.metricsInterval = setInterval(() => {
      if (this.metrics.responseTimes.length > 0) {
        const avgResponseTime = this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length;
        const p95ResponseTime = this.calculatePercentile(this.metrics.responseTimes, 95);
        
        console.log(`📊 Metrics - Requests: ${this.metrics.requests}, Responses: ${this.metrics.responses}, Errors: ${this.metrics.errors}, Avg RT: ${avgResponseTime.toFixed(2)}ms, P95 RT: ${p95ResponseTime.toFixed(2)}ms, Concurrent: ${this.metrics.concurrentConnections}`);
      }
    }, 5000);
  }

  calculatePercentile(arr, percentile) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  generateReport() {
    clearInterval(this.metricsInterval);
    
    const totalRequests = this.metrics.requests;
    const totalResponses = this.metrics.responses;
    const totalErrors = this.metrics.errors;
    const successRate = ((totalResponses - totalErrors) / totalRequests * 100).toFixed(2);
    const avgResponseTime = this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length;
    const p95ResponseTime = this.calculatePercentile(this.metrics.responseTimes, 95);
    const p99ResponseTime = this.calculatePercentile(this.metrics.responseTimes, 99);
    const maxConcurrent = this.metrics.maxConcurrentConnections;
    
    console.log('\n📈 LOAD TEST RESULTS');
    console.log('===================');
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Total Responses: ${totalResponses}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`P95 Response Time: ${p95ResponseTime.toFixed(2)}ms`);
    console.log(`P99 Response Time: ${p99ResponseTime.toFixed(2)}ms`);
    console.log(`Max Concurrent Connections: ${maxConcurrent}`);
    
    // Performance thresholds
    const performanceReport = {
      passed: true,
      issues: [],
    };
    
    if (successRate < 99) {
      performanceReport.passed = false;
      performanceReport.issues.push(`Low success rate: ${successRate}% (expected: >99%)`);
    }
    
    if (avgResponseTime > 1000) {
      performanceReport.passed = false;
      performanceReport.issues.push(`High average response time: ${avgResponseTime.toFixed(2)}ms (expected: <1000ms)`);
    }
    
    if (p95ResponseTime > 2000) {
      performanceReport.passed = false;
      performanceReport.issues.push(`High P95 response time: ${p95ResponseTime.toFixed(2)}ms (expected: <2000ms)`);
    }
    
    console.log(`\n🎯 Performance Assessment: ${performanceReport.passed ? '✅ PASSED' : '❌ FAILED'}`);
    if (!performanceReport.passed) {
      performanceReport.issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    // Save detailed results
    const results = {
      timestamp: new Date().toISOString(),
      config: this.config,
      metrics: {
        totalRequests,
        totalResponses,
        totalErrors,
        successRate: parseFloat(successRate),
        avgResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        maxConcurrent,
      },
      performance: performanceReport,
    };
    
    require('fs').writeFileSync(
      `load-test-results-${Date.now()}.json`,
      JSON.stringify(results, null, 2)
    );
    
    console.log('\n📄 Detailed results saved to load-test-results-*.json');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class VirtualUser {
  constructor(id, config, sharedMetrics) {
    this.id = id;
    this.config = config;
    this.metrics = sharedMetrics;
    this.isActive = false;
    this.authToken = null;
  }

  async start() {
    this.isActive = true;
    this.metrics.concurrentConnections++;
    this.metrics.maxConcurrentConnections = Math.max(
      this.metrics.maxConcurrentConnections,
      this.metrics.concurrentConnections
    );
    
    try {
      // Simulate user authentication
      await this.authenticate();
      
      // Start user simulation loop
      this.simulateUserBehavior();
    } catch (error) {
      console.error(`User ${this.id} failed to start:`, error.message);
      this.metrics.errors++;
    }
  }

  async stop() {
    this.isActive = false;
    this.metrics.concurrentConnections--;
  }

  async authenticate() {
    const startTime = performance.now();
    
    try {
      // Simulate GraphQL authentication mutation
      const response = await this.makeGraphQLRequest(`
        mutation SignIn($email: String!, $password: String!) {
          signIn(email: $email, password: $password) {
            accessToken
            user {
              id
              email
              displayName
            }
          }
        }
      `, {
        email: `testuser${this.id}@example.com`,
        password: 'TestPassword123!',
      });
      
      this.authToken = response.data?.signIn?.accessToken;
      
      const endTime = performance.now();
      this.recordMetrics(endTime - startTime, !response.errors);
    } catch (error) {
      const endTime = performance.now();
      this.recordMetrics(endTime - startTime, false);
      throw error;
    }
  }

  async simulateUserBehavior() {
    const behaviors = [
      () => this.listBoards(),
      () => this.viewBoard(),
      () => this.claimSquares(),
      () => this.checkScores(),
    ];
    
    while (this.isActive) {
      try {
        // Random behavior selection
        const behavior = behaviors[Math.floor(Math.random() * behaviors.length)];
        await behavior();
        
        // Random delay between actions (1-5 seconds)
        await this.sleep(1000 + Math.random() * 4000);
      } catch (error) {
        this.metrics.errors++;
        await this.sleep(5000); // Wait longer on error
      }
    }
  }

  async listBoards() {
    const startTime = performance.now();
    
    try {
      const response = await this.makeGraphQLRequest(`
        query ListBoards {
          listBoards {
            items {
              id
              name
              status
              totalSquares
              claimedSquares
            }
          }
        }
      `);
      
      const endTime = performance.now();
      this.recordMetrics(endTime - startTime, !response.errors);
    } catch (error) {
      const endTime = performance.now();
      this.recordMetrics(endTime - startTime, false);
    }
  }

  async viewBoard() {
    const startTime = performance.now();
    
    try {
      const response = await this.makeGraphQLRequest(`
        query GetBoard($id: ID!) {
          getBoard(id: $id) {
            id
            name
            status
            squares {
              items {
                id
                userId
                gridPosition
                paymentStatus
              }
            }
          }
        }
      `, {
        id: 'test-board-1',
      });
      
      const endTime = performance.now();
      this.recordMetrics(endTime - startTime, !response.errors);
    } catch (error) {
      const endTime = performance.now();
      this.recordMetrics(endTime - startTime, false);
    }
  }

  async claimSquares() {
    const startTime = performance.now();
    
    try {
      const response = await this.makeGraphQLRequest(`
        mutation ClaimSquares($input: ClaimSquaresInput!) {
          claimSquares(input: $input) {
            squares {
              id
              userId
              paymentStatus
            }
          }
        }
      `, {
        input: {
          boardId: 'test-board-1',
          numberOfSquares: Math.floor(Math.random() * 5) + 1, // 1-5 squares
        },
      });
      
      const endTime = performance.now();
      this.recordMetrics(endTime - startTime, !response.errors);
    } catch (error) {
      const endTime = performance.now();
      this.recordMetrics(endTime - startTime, false);
    }
  }

  async checkScores() {
    const startTime = performance.now();
    
    try {
      const response = await this.makeGraphQLRequest(`
        query ListGames($boardId: ID!) {
          gamesByBoard(boardId: $boardId) {
            items {
              id
              gameNumber
              team1
              team2
              team1Score
              team2Score
              status
            }
          }
        }
      `, {
        boardId: 'test-board-1',
      });
      
      const endTime = performance.now();
      this.recordMetrics(endTime - startTime, !response.errors);
    } catch (error) {
      const endTime = performance.now();
      this.recordMetrics(endTime - startTime, false);
    }
  }

  async makeGraphQLRequest(query, variables = {}) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        query,
        variables,
      });
      
      const options = {
        hostname: new URL(this.config.graphqlEndpoint).hostname,
        path: new URL(this.config.graphqlEndpoint).pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` }),
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      });
      
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  recordMetrics(responseTime, success) {
    this.metrics.requests++;
    this.metrics.responses++;
    this.metrics.responseTimes.push(responseTime);
    
    if (!success) {
      this.metrics.errors++;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI execution
if (require.main === module) {
  const config = {
    baseUrl: process.env.LOAD_TEST_URL || 'https://main.d1234567890.amplifyapp.com',
    graphqlEndpoint: process.env.GRAPHQL_ENDPOINT || 'https://abcdef123456.appsync-api.us-east-1.amazonaws.com/graphql',
    concurrentUsers: parseInt(process.env.CONCURRENT_USERS) || 50,
    testDuration: parseInt(process.env.TEST_DURATION) || 300000,
    rampUpTime: parseInt(process.env.RAMP_UP_TIME) || 60000,
  };
  
  const loadTester = new LoadTester(config);
  loadTester.runLoadTest().catch(console.error);
}

module.exports = { LoadTester, VirtualUser };