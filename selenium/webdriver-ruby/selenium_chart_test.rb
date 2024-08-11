# frozen_string_literal: true

require 'selenium-webdriver'
require 'test-unit'

# Test Yahoo Charts for CSCO
class SeleniumChartTest < Test::Unit::TestCase
  def setup
    @url = 'https://finance.yahoo.com/quote/CSCO/'
    @driver = Selenium::WebDriver.for :chrome
    action = Selenium::WebDriver::ActionBuilder

    @driver.get(@url)
    @driver.manage.window.resize_to(1280, 720)
    @driver.manage.timeouts.implicit_wait = 5

    @wait = Selenium::WebDriver::Wait.new(timeout: 5)
  end

  def test_heading_one
    heading = @wait.until { @driver.find_element(:css, 'section.container h1') }
    puts "Found elem: #{heading.text}"
    assert_equal(heading.text, 'Cisco Systems, Inc. (CSCO)')
  end

  def teardown
    @driver.quit
  end
end
