# frozen_string_literal: true

require 'capybara/rspec'
require 'selenium-webdriver'

RSpec.describe 'Test Run' do
  def setup_test
    @driver = Capybara::Session.new(:selenium)
    @url = 'https://www.google.com'
    @driver.visit @url
  end

  it 'Should load the Google homepage correctly' do
    setup_test
    page = @driver
    sign_in_button = @driver.find('a[aria-label="Sign in"]')
    expect(page).to have_selector('input[value="Google Search"]')
    expect(sign_in_button.text).to eql('Sign in')
    @driver.quit
  end
end
