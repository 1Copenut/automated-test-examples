# frozen_string_literal: true

require 'selenium-webdriver'
require 'minitest'

# Test Google search interaction with Chrome
class GoogleSearchTest < Minitest::Test
  def setup
    @driver = Selenium::WebDriver.for :chrome
    @url = 'https://www.google.com/'
    @driver.manage.timeouts.implicit_wait = 30
  end

  def test_google_search
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

  def teardown
    @driver.quit
  end
end
