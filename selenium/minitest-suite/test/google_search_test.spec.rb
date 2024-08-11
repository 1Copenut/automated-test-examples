# frozen_string_literal: true

require 'minitest/autorun'
require 'selenium-webdriver'

describe 'Google search test' do
  before do
    @driver = Selenium::WebDriver.for :firefox
    @url = 'https://www.google.com/'
    @driver.manage.timeouts.implicit_wait = 10
  end

  describe 'Test the search input' do
    it 'accepts a search query' do
      @driver.get(@url)

      # Search for the search box using the name selector
      @query_box = @driver.find_element(:name, 'q')

      # Input the search phrase in the query_box element
      @query_box.send_keys('Selenium webdriver')

      # Click submit button (enter to search)
      @query_box.submit

      # Add an explicit wait to ensure the page finishes loading
      wait = Selenium::WebDriver::Wait.new(timeout: 30)

      wait.until { @driver.title.include? 'Selenium webdriver - Google Search' }

      # Assert that the search bar title is what you expect
      assert_equal('Selenium webdriver - Google Search', @driver.title)
    end
  end

  after do
    @driver.quit
  end
end
