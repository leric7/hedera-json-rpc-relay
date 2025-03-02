import 'cypress-wait-until';
import * as bootstrapInfo from '../../../src/contracts/.bootstrapInfo.json';
import { ethers } from 'ethers';

describe('Test Core Hedera User Scenarios', function() {
  this.timeout(180000);

  it('Connects with Metamask', function() {
    cy.visit('http://localhost:3000');
    cy.contains('Connect Account').click();
    cy.acceptMetamaskAccess().should('be.true');
    cy.switchToCypressWindow();

    // check the UI
    cy.get('#showAliasBtn').should('not.be.disabled');
    cy.get('#btnDeployContract').should('not.be.disabled');
    cy.get('#btnReadGreeting').should('not.be.disabled');
    cy.get('#btnUpdateGreeting').should('not.be.disabled');
  }).timeout(180000);

  describe('Tests with normal account', function() {
    mandatoryTests();
  });

  describe('Tests with hollow account created via TX', function() {
    let hollowAccount = ethers.Wallet.createRandom();

    it('Transfer HBARs to hollow account', function() {
      cy.get('#sendHbarsToField').clear().type(hollowAccount.address);
      cy.get('#sendHbarsAmountField').clear().type('10000000000000000').trigger('change');
      cy.get('#sendHbarsBtn').should('not.be.disabled').click();
      cy.confirmMetamaskTransaction();

      cy.waitUntil(() => cy.get('#sendHbarMsg').should('have.text', ' Done '));
      cy.waitUntil(() => cy.get('#toBalanceAfterTransfer').should('have.text', ' Balance after transfer: 0.01 '));
    }).timeout(180000);

    it('Second Transfer HBARs to hollow account', function() {
      cy.get('#sendHbarsToField').clear().type(hollowAccount.address);
      cy.get('#sendHbarsAmountField').clear().type('60000000000000000000').trigger('change');
      cy.get('#sendHbarsBtn').should('not.be.disabled').click();
      cy.confirmMetamaskTransaction();

      cy.waitUntil(() => cy.get('#sendHbarMsg').should('have.text', ' Done '));
      cy.waitUntil(() => cy.get('#toBalanceAfterTransfer').should('have.text', ' Balance after transfer: 60.01 '));
    }).timeout(180000);

    it('Should switch to hollow account created via Transfer', function() {
      cy.disconnectMetamaskWalletFromAllDapps();
      cy.importMetamaskAccount(hollowAccount._signingKey().privateKey);
      cy.switchMetamaskAccount(3);

      cy.visit('http://localhost:3000');
      cy.contains('Connect Account').click();
      cy.acceptMetamaskAccess().should('be.true');
      cy.switchToCypressWindow();
    });

    mandatoryTests();
  });

  describe('Tests with hollow account created via Contract', function() {
    let hollowAccount = ethers.Wallet.createRandom();

    it('Transfer HBARs to hollow account via contract', function() {
      cy.get('#hollowAccountAddressField').clear().type(hollowAccount.address);
      cy.get('#activateHollowAccountBtn').should('not.be.disabled').click();
      cy.confirmMetamaskTransaction();

      cy.waitUntil(() => cy.get('#activateHollowAccountMsg').should('have.text', ' Done '));
    }).timeout(180000);

    it('Should switch to hollow account created via Contract', function() {
      cy.disconnectMetamaskWalletFromAllDapps();
      cy.importMetamaskAccount(hollowAccount._signingKey().privateKey);
      cy.switchMetamaskAccount(4);

      cy.visit('http://localhost:3000');
      cy.contains('Connect Account').click();
      cy.acceptMetamaskAccess().should('be.true');
      cy.switchToCypressWindow();
    });

    mandatoryTests();
  });

  function mandatoryTests() {
    it('Show alias', function() {
      cy.get('#showAliasBtn').should('not.be.disabled').click();
      cy.confirmMetamaskSignatureRequest();
      cy.waitUntil(() => cy.get('#aliasField').invoke('text').should('have.length', 66));
    }).timeout(180000);

    it('Deploy contract', function() {

      // deploy the contract
      cy.get('#btnDeployContract').should('not.be.disabled').click();
      cy.confirmMetamaskTransaction();

      // test a view call
      cy.get('#btnReadGreeting').should('not.be.disabled').click();
      cy.waitUntil(() => cy.get('#contractViewMsg').should('have.text', ' Result: initial_msg '));

      // test a update call
      cy.get('#updateGreetingText').type('updated_text');
      cy.get('#btnUpdateGreeting').should('not.be.disabled').click();
      cy.confirmMetamaskTransaction();
      cy.waitUntil(() => cy.get('#contractUpdateMsg').should('have.text', ' Updated text: updated_text '));

      // test the updated msg
      cy.get('#btnReadGreeting').should('not.be.disabled').click();
      cy.waitUntil(() => cy.get('#contractViewMsg').should('have.text', ' Result: updated_text '));
    }).timeout(180000);

    it('Transfer HTS token', function() {

      // test the HTS transfer
      cy.get('#htsTokenAddressField').type(bootstrapInfo.HTS_ADDRESS);
      cy.get('#htsReceiverAddressField').type('0x54C51b7637BF6fE9709e1e0EBc8b2Ca6a24b0f0A');
      cy.get('#htsTokenAmountField').clear().type(1000).trigger('change');
      cy.get('#htsTokenTransferBtn').should('not.be.disabled').click();
      cy.confirmMetamaskTransaction();

      cy.waitUntil(() => cy.get('#htsTokenMsg').should('have.text', ' Done '));
    }).timeout(180000);

    it('Transfer HBARs', function() {
      cy.get('#sendHbarsToField').clear().type('0x54C51b7637BF6fE9709e1e0EBc8b2Ca6a24b0f0A');
      cy.get('#sendHbarsAmountField').clear().type('10000000000000000').trigger('change');
      cy.get('#sendHbarsBtn').should('not.be.disabled').click();
      cy.confirmMetamaskTransaction();

      cy.waitUntil(() => cy.get('#sendHbarMsg').should('have.text', ' Done '));
    }).timeout(180000);

    it('Associate HTS', function() {
      cy.get('#htsTokenAssociateBtn').should('not.be.disabled').click();
      cy.confirmMetamaskTransaction();

      cy.waitUntil(() => cy.get('#htsTokenAssociateMsg').should('have.text', ' Done '));
    }).timeout(180000);
  }
});
