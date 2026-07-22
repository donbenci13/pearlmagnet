#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { PearlmagnetStack } from '../lib/pearlmagnet-stack';

const app = new cdk.App();
new PearlmagnetStack(app, 'PearlmagnetStack', {
  env: { account: '992382665558', region: 'us-east-1' },
});